import * as path from 'path';
import * as fs from 'fs';
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
    const [command, ...args] = [...parts, mahoPath, 'dev:lsp:start'];

    const serverOptions: ServerOptions = {
        command,
        args,
        options: { cwd: workspaceFolder.uri.fsPath },
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

export function deactivate(): Promise<void> | undefined {
    return client?.stop();
}
