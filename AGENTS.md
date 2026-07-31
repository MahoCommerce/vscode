# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maho for VS Code — a Visual Studio Code extension that integrates the Maho Intelligence LSP server for the Maho ecommerce platform. It provides PHP class alias completion, hover, go-to-definition, and diagnostics for Maho's class alias system (e.g. `Mage::getModel('catalog/product')`).

## Build & Development

This is a VS Code extension written in TypeScript.

```bash
npm install          # Install dependencies
npm run typecheck    # Typecheck with tsc (esbuild does not typecheck)
npm run compile      # Compile TypeScript to JavaScript
npm run watch        # Watch mode for development
npm run package      # Package as .vsix for distribution
```

There are no tests configured in this project. `.github/workflows/ci.yml` runs typecheck, compile and `vsce package` on every push to `main` and every PR; the release workflow repeats the typecheck before publishing. Note that `npm run compile` is a bare esbuild bundle: it strips types without checking them, so a passing build proves nothing about type correctness on its own.

## Testing locally

To test the extension in a VS Code development host:

1. Open this project in VS Code
2. Press `F5` (or **Run > Start Debugging**) — this launches a new VS Code window with the extension loaded
3. In the new window, open a Maho project folder
4. The extension activates when it detects the `maho` file in the workspace root

The Output panel (`View > Output`, then select "Maho Intelligence LSP" from the dropdown) shows LSP server logs.

## Publishing

The extension is published to three channels under the `mahocommerce` publisher:

- **VS Code Marketplace** — https://marketplace.visualstudio.com/items?itemName=MahoCommerce.maho
- **Open VSX Registry** (VSCodium, Gitpod, etc.) — https://open-vsx.org/extension/mahocommerce/maho
- **GitHub Releases** — the packaged `.vsix` is attached to each release

### Automated (preferred)

Publishing is fully automated by `.github/workflows/release.yml`. Pushing a `vX.Y.Z` tag builds the `.vsix`, creates the GitHub release with it attached, and publishes to Open VSX and the VS Code Marketplace.

```bash
npm version patch --no-git-tag-version   # bump package.json (0.10.x -> 0.10.x+1)
git commit -am "Bump version to X.Y.Z"
git push
git tag vX.Y.Z && git push origin vX.Y.Z  # triggers the release workflow
```

The publish steps are gated on repository secrets and are skipped (not failed) when a secret is absent:

- `OVSX_TOKEN` — Open VSX access token
- `VSCE_PAT` — Azure DevOps Personal Access Token (scope: **Marketplace → Manage**), created under the **Microsoft account** identity that owns the `MahoCommerce` publisher (not an Entra/work-tenant identity, or publishing is denied). PATs expire within 1 year and must be rotated.

GitHub release creation must attach the `.vsix` atomically because the org uses **immutable releases** (assets cannot be added after publish). A burned tag name (from a failed immutable release) cannot be reused — bump the version instead.

### Manual (fallback)

```bash
npx @vscode/vsce publish --packagePath maho-*.vsix -p <VSCE_PAT>   # VS Code Marketplace
npx ovsx publish maho-*.vsix -p <OVSX_TOKEN>                       # Open VSX
```

The VS Code Marketplace also supports a no-token browser upload at https://marketplace.visualstudio.com/manage/publishers/mahocommerce (New extension → Visual Studio Code).

## Architecture

Single-file extension (`src/extension.ts`) using the `vscode-languageclient` package:

- **`activate()`** — called when VS Code detects a `maho` file in the workspace root. It:
  1. Checks for `maho` CLI in the workspace root
  2. Reads the `maho.phpCommand` setting (defaults to `php`), splits it, and prepends it to `./maho dev:lsp:start`
  3. Starts a `LanguageClient` with the resulting command
  4. Registers Maho's MCP server (`./maho dev:mcp:start`) via `vscode.lm.registerMcpServerDefinitionProvider`, feature-detected so hosts without the API skip it
- **`deactivate()`** — stops the language client

The script is always passed as the relative `./maho` with `cwd` set to the workspace root, never as a host absolute path, which would not exist when `maho.phpCommand` runs PHP inside a container. The absolute path is used only for the `fs.existsSync` activation check.

The extension itself does not contain the LSP server — it delegates to the `maho` CLI (part of the Maho ecommerce framework, v26.5+) which runs the actual LSP.
