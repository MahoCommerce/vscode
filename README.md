# Maho for VS Code

[![Get from VS Code Marketplace](https://img.shields.io/badge/Get_from-VS_Code_Marketplace-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0yMy4xNSAyLjU4N0wxOC4yMS4yMWExLjQ5NCAxLjQ5NCAwIDAgMC0xLjcwNS4yOWwtOS40NiA4LjYzLTQuMTItMy4xMjhhLjk5OS45OTkgMCAwIDAtMS4yNzYuMDU3TC4zMjcgNy4yNjFBMSAxIDAgMCAwIC4zMjYgOC43NEwzLjg5OSAxMiAuMzI2IDE1LjI2YTEgMSAwIDAgMCAuMDAxIDEuNDc5TDEuNjUgMTcuOTRhLjk5OS45OTkgMCAwIDAgMS4yNzYuMDU3bDQuMTItMy4xMjggOS40NiA4LjYzYTEuNDkyIDEuNDkyIDAgMCAwIDEuNzA0LjI5bDQuOTQyLTIuMzc3QTEuNSAxLjUgMCAwIDAgMjQgMjAuMDZWMy45MzlhMS41IDEuNSAwIDAgMC0uODUtMS4zNTJ6bS01LjE0NiAxNC44NjFMMTAuODI2IDEybDcuMTc4LTUuNDQ4djEwLjg5NnoiLz48L3N2Zz4=)](https://marketplace.visualstudio.com/items?itemName=MahoCommerce.maho)
[![Get from Open VSX](https://img.shields.io/badge/Get_from-Open_VSX-000000?style=for-the-badge&logo=vscodium&logoColor=white)](https://open-vsx.org/extension/mahocommerce/maho)

[Maho Intelligence](https://mahocommerce.com) LSP integration for [Visual Studio Code](https://code.visualstudio.com).

Provides code completion, hover information, go-to-definition, and diagnostics for Maho's class alias system across PHP and XML files.

## Prerequisites

- VS Code or VSCodium 1.101 or later
- [Maho](https://mahocommerce.com) 26.5 or later
- PHP available on your PATH (or configured via settings)

## Setup

1. Install the extension:
   - **VS Code**: Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=MahoCommerce.maho), or search for "Maho" in the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
   - **VSCodium**: Install from the [Open VSX Registry](https://open-vsx.org/extension/mahocommerce/maho)
   - **Manual install**: Download the `.vsix` file from the [latest release](https://github.com/MahoCommerce/vscode/releases/latest), then run `code --install-extension maho-*.vsix` (or `codium --install-extension maho-*.vsix` for VSCodium)
2. Open a Maho project — the extension activates automatically when it detects a `maho` file in the workspace root

## Configuration

By default, the extension uses `php` from your PATH and the `maho` CLI in the workspace root. You can override the PHP command in VS Code settings via `maho.phpCommand`:

### Custom PHP path

```json
{
  "maho.phpCommand": "/usr/local/bin/php8.3"
}
```

### Docker

```json
{
  "maho.phpCommand": "docker exec mycontainer php"
}
```

## Features

All features work across both **PHP** and **XML** files.

### Completion

Suggests aliases and paths as you type (triggered by `'` and `"` characters).

**PHP contexts:**

| Call | Example |
|------|---------|
| Model aliases | `Mage::getModel('catalog/product')` |
| Model aliases | `Mage::getSingleton('catalog/product')` |
| Resource model aliases | `Mage::getResourceModel('catalog/product')` |
| Resource model aliases | `Mage::getResourceSingleton('catalog/product')` |
| Helper aliases | `Mage::helper('catalog')` |
| Block aliases | `$layout->createBlock('catalog/product_list')` |
| Block aliases | `$layout->getBlockSingleton('catalog/product_list')` |
| Config paths | `Mage::getStoreConfig('web/secure/base_url')` |
| Config paths | `Mage::getStoreConfigFlag('web/secure/use_in_frontend')` |
| Event names | `Mage::dispatchEvent('catalog_product_save_after')` |

**XML contexts:**

Completion is context-aware based on XML tag and ancestry:

- `<class>` tags — model alias or FQCN depending on parent path (observers, rewrites, class prefixes, etc.)
- `<source_model>`, `<backend_model>` — model aliases
- `<frontend_model>`, `<render>`, `<renderer>` — block aliases
- `<block type="...">` attribute — block aliases
- `<template>` tag and `template` attribute — template paths
- `<model>` inside cron jobs — model alias with method callback (e.g. `catalog/product_action::run`)
- `ifconfig` attribute — config paths
- `handle` attribute — layout handles

### Hover

Shows context-sensitive documentation at cursor position.

- **Class aliases** (model, helper, block, resource model) — resolved PHP class name, file path, and rewrite info if applicable
- **Event names** — all registered observers grouped by area (frontend, admin), with class, method, and observer name
- **Config paths** — field label, section/group hierarchy, type, and default value
- **Fully qualified class names** in XML — class name and file location
- **XML methods** — method name, parent class, and method signature extracted from source
- **Cron callbacks** — model alias, method, class details, and method signature
- **Template paths** — resolved file location in theme directories
- **Layout handles** — handle name, defining file, and block count

### Go-to-definition

Jumps to the source file for:

- Class aliases (model, helper, block, resource model) → class file
- Fully qualified class names in XML → class file
- XML methods → method line in the class file
- Cron callbacks → class file or method line
- Template paths → template file in the design directory

### Diagnostics

Reports unresolved aliases as warnings (source: `maho-intelligence`). Diagnostics run automatically with a 0.3s debounce on document changes.

**PHP** — detects unresolved aliases in all `Mage::getModel()`, `Mage::getSingleton()`, `Mage::helper()`, `Mage::getResourceModel()`, `Mage::getResourceSingleton()`, `->createBlock()`, and `->getBlockSingleton()` calls.

**XML** — detects unresolved aliases in `<class>`, `<source_model>`, `<backend_model>`, `<frontend_model>`, `<render>`, `<renderer>`, `<block type="...">`, and `<model>` (cron callback) contexts.

## AI agent integration (MCP)

In addition to the LSP, the extension registers Maho's [Model Context Protocol](https://modelcontextprotocol.io) server with the editor's AI agent, so the agent can query your Maho project's intelligence directly. It runs `./maho dev:mcp:start` over stdio, scoped to the workspace and using the same `maho.phpCommand` setting as the LSP — no manual MCP configuration needed.

- **VS Code**: the MCP server is discovered automatically by Copilot agent mode (requires VS Code 1.101 or later).
- **VSCodium / other agents**: registration is harmless but only takes effect if your agent consumes VS Code's MCP registry. Agents with their own MCP config (Cline, Continue, etc.) should add `./maho dev:mcp:start` manually.

Requires Maho with MCP support (`react/stream` installed: `composer require react/stream`).

## License

MIT
