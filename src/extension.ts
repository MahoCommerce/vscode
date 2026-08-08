import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, window } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';
import { inferRemoteRoot, mapPath, trimTrailingSlash } from './pathMapping';

let client: LanguageClient | undefined;
const MAHO_SCRIPT = './maho';
const ROOT_PROBE_TIMEOUT_MS = 10_000;
const MAX_ROOT_INFERENCE_ATTEMPTS = 8;

export function activate(context: ExtensionContext): void {
    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const mahoPath = path.join(workspaceFolder.uri.fsPath, 'maho');
    if (!fs.existsSync(mahoPath)) {
        return;
    }

    const config = workspace.getConfiguration('maho');
    const phpCommand: string = config.get('phpCommand', 'php');
    const parts = phpCommand.split(/\s+/).filter(Boolean);
    const cwd = workspaceFolder.uri.fsPath;

    // Relative to cwd, not the host absolute path: the PHP command may run in another
    // filesystem namespace (e.g. `docker exec -w /app php`) where that path is absent.
    const mapper = new RemotePathMapper(workspaceFolder.uri);
    startLspClient(parts, MAHO_SCRIPT, cwd, mapper);
    detectRemoteRoot(parts, cwd, mapper);
    registerMcpServer(context, parts, MAHO_SCRIPT, workspaceFolder.uri);
}

function startLspClient(
    phpParts: string[],
    mahoScript: string,
    cwd: string,
    mapper: RemotePathMapper,
): void {
    const [command, ...args] = [...phpParts, mahoScript, 'dev:lsp:start'];

    const serverOptions: ServerOptions = {
        command,
        args,
        options: { cwd },
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'php' },
            { scheme: 'file', language: 'xml' },
        ],
        // Inbound URIs carry the server's own paths and need translating; outbound ones
        // keep the default, since the server already accepts the local paths we send.
        uriConverters: {
            code2Protocol: (uri) => uri.toString(),
            protocol2Code: (value) => mapper.toLocalUri(value),
        },
    };

    client = new LanguageClient(
        'maho-intelligence-lsp',
        'Maho Intelligence LSP',
        serverOptions,
        clientOptions,
    );

    client.start().catch((error) => {
        window.showErrorMessage(`Maho Intelligence LSP failed to start: ${error.message}`);
    });
}

// Translates server-side paths into workspace paths, and stays inert when the two match.
class RemotePathMapper {
    private remoteRoot: string | undefined;
    private detected = false;
    private inferenceAttempts = 0;

    constructor(private readonly workspaceUri: vscode.Uri) {}

    // `root` is an absolute path as the server sees it, i.e. its own working directory.
    setRemoteRoot(root: string): void {
        const remote = trimTrailingSlash(vscode.Uri.file(root).path);
        const local = trimTrailingSlash(this.workspaceUri.path);

        this.remoteRoot = samePath(remote, local) ? undefined : remote;
        this.detected = true;
    }

    toLocalUri(value: string): vscode.Uri {
        const uri = vscode.Uri.parse(value);
        if (uri.scheme !== 'file') {
            return uri;
        }

        const remoteRoot = this.remoteRootFor(uri);
        if (!remoteRoot) {
            return uri;
        }

        const localPath = mapPath(remoteRoot, this.workspaceUri.path, uri.path);
        return localPath === undefined ? uri : uri.with({ path: localPath });
    }

    // Falls back to inference while the probe is still running, or when it could not
    // report a root at all. A path that already resolves locally needs no mapping.
    private remoteRootFor(uri: vscode.Uri): string | undefined {
        if (this.remoteRoot || this.detected) {
            return this.remoteRoot;
        }
        if (this.inferenceAttempts >= MAX_ROOT_INFERENCE_ATTEMPTS || fs.existsSync(uri.fsPath)) {
            return undefined;
        }

        this.inferenceAttempts++;
        this.remoteRoot = inferRemoteRoot(this.workspaceUri.path, uri.path, (localUriPath) =>
            fs.existsSync(this.workspaceUri.with({ path: localUriPath }).fsPath),
        );
        if (this.remoteRoot) {
            log(`Inferred server project root from a response path: ${this.remoteRoot}`);
        }
        return this.remoteRoot;
    }
}

// The server's own working directory is the project root as it sees it, whatever wrapper
// `maho.phpCommand` uses, so asking the process beats parsing docker/ssh/ddev command
// lines. Fire-and-forget: the client starts now and picks the root up when it lands.
function detectRemoteRoot(phpParts: string[], cwd: string, mapper: RemotePathMapper): void {
    const [command, ...args] = [...phpParts, '-r', 'echo getcwd();'];

    const child = cp.execFile(
        command,
        args,
        { cwd, timeout: ROOT_PROBE_TIMEOUT_MS, windowsHide: true },
        (error, stdout) => {
            const root = stdout.trim();
            if (error || !/^([a-zA-Z]:[\\/]|\/)/.test(root)) {
                log(
                    'Could not determine the server project root ' +
                        `(${error?.message ?? `unexpected output: ${root}`}); ` +
                        'falling back to inferring it from server responses.',
                );
                return;
            }
            mapper.setRemoteRoot(root);
            log(`Server project root: ${root}`);
        },
    );

    // `docker exec -i` hands the probe an stdin it never writes to; close it so the
    // child cannot linger waiting on input.
    child.stdin?.end();
}

// Windows is case-insensitive, and the drive letter's case in particular differs between
// VS Code URIs and getcwd() output.
function samePath(a: string, b: string): boolean {
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function log(message: string): void {
    client?.outputChannel.appendLine(`[maho] ${message}`);
}

// Registers Maho's MCP server with the editor's agent (e.g. Copilot agent mode) so it is
// discovered automatically, scoped to this workspace and using the configured PHP command.
// Feature-detected: a host that predates the MCP API, or VSCodium without an MCP-aware agent,
// simply skips this — the LSP above is unaffected.
function registerMcpServer(
    context: ExtensionContext,
    phpParts: string[],
    mahoScript: string,
    workspaceUri: vscode.Uri,
): void {
    if (!vscode.lm?.registerMcpServerDefinitionProvider) {
        return;
    }

    const [command, ...args] = [...phpParts, mahoScript, 'dev:mcp:start'];

    const provider: vscode.McpServerDefinitionProvider = {
        provideMcpServerDefinitions() {
            const definition = new vscode.McpStdioServerDefinition(
                'Maho Intelligence',
                command,
                args,
            );
            definition.cwd = workspaceUri;
            return [definition];
        },
    };

    context.subscriptions.push(
        vscode.lm.registerMcpServerDefinitionProvider('maho-intelligence-mcp', provider),
    );
}

export function deactivate(): Promise<void> | undefined {
    return client?.stop();
}
