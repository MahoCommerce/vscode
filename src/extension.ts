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

    const config = workspace.getConfiguration('maho');
    const customCommand: string[] = config.get('customCommand', []);

    let command: string;
    let args: string[];

    if (customCommand.length > 0) {
        [command, ...args] = customCommand;
    } else {
        const mahoPathSetting: string = config.get('mahoPath', '');
        const mahoPath = mahoPathSetting || path.join(workspaceFolder.uri.fsPath, 'maho');

        if (!fs.existsSync(mahoPath)) {
            return;
        }

        const phpPath: string = config.get('phpPath', '') || 'php';
        command = phpPath;
        args = [mahoPath, 'dev:lsp:start'];
    }

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
