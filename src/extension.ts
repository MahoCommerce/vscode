import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, window } from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

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

    startLspClient(parts, mahoPath, cwd);
    registerMcpServer(context, parts, mahoPath, workspaceFolder.uri);
}

function startLspClient(phpParts: string[], mahoPath: string, cwd: string): void {
    const [command, ...args] = [...phpParts, mahoPath, 'dev:lsp:start'];

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

// Registers Maho's MCP server with the editor's agent (e.g. Copilot agent mode) so it is
// discovered automatically, scoped to this workspace and using the configured PHP command.
// Feature-detected: hosts without the MCP API (older VS Code, VSCodium without an MCP-aware
// agent) simply skip this — the LSP above is unaffected.
function registerMcpServer(
    context: ExtensionContext,
    phpParts: string[],
    mahoPath: string,
    workspaceUri: vscode.Uri,
): void {
    if (!vscode.lm?.registerMcpServerDefinitionProvider) {
        return;
    }

    const [command, ...args] = [...phpParts, mahoPath, 'dev:mcp:start'];

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
