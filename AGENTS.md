# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maho for VS Code — a Visual Studio Code extension that integrates the Maho Intelligence LSP server for the Maho ecommerce platform. It provides PHP class alias completion, hover, go-to-definition, and diagnostics for Maho's class alias system (e.g. `Mage::getModel('catalog/product')`).

## Build & Development

This is a VS Code extension written in TypeScript.

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript to JavaScript
npm run watch        # Watch mode for development
npm run package      # Package as .vsix for distribution
```

There are no tests configured in this project.

## Testing locally

To test the extension in a VS Code development host:

1. Open this project in VS Code
2. Press `F5` (or **Run > Start Debugging**) — this launches a new VS Code window with the extension loaded
3. In the new window, open a Maho project folder
4. The extension activates when it detects the `maho` file in the workspace root

The Output panel (`View > Output`, then select "Maho Intelligence LSP" from the dropdown) shows LSP server logs.

## Publishing

The extension is published to the VS Code Marketplace under the `mahocommerce` publisher.

```bash
# Login to the publisher (requires a Personal Access Token from https://dev.azure.com)
npx @vscode/vsce login mahocommerce

# Package into a .vsix file
npx @vscode/vsce package

# Publish to the Marketplace
npx @vscode/vsce publish

# Or bump version and publish in one step
npx @vscode/vsce publish patch   # 0.0.1 -> 0.0.2
npx @vscode/vsce publish minor   # 0.0.x -> 0.1.0
npx @vscode/vsce publish major   # 0.x.y -> 1.0.0
```

To publish on the Open VSX Registry (used by VSCodium, Gitpod, etc.):

```bash
npx ovsx publish -p <access-token>
```

## Architecture

Single-file extension (`src/extension.ts`) using the `vscode-languageclient` package:

- **`activate()`** — called when VS Code detects a `maho` file in the workspace root. It:
  1. Checks for `maho` CLI in the workspace root
  2. Reads the `maho.phpCommand` setting (defaults to `php`), splits it, and prepends it to `./maho dev:lsp:start`
  3. Starts a `LanguageClient` with the resulting command
- **`deactivate()`** — stops the language client

The extension itself does not contain the LSP server — it delegates to the `maho` CLI (part of the Maho ecommerce framework, v26.5+) which runs the actual LSP.
