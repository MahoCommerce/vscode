# Maho for VS Code

[Maho Intelligence](https://mahocommerce.com) LSP integration for [Visual Studio Code](https://code.visualstudio.com).

Provides code completion, hover information, go-to-definition, and diagnostics for Maho's class alias system across PHP and XML files.

## Prerequisites

- [Maho](https://mahocommerce.com) 26.5 or later
- PHP available on your PATH (or configured via settings)

## Setup

1. Install the extension from the VS Code Marketplace
2. Open a Maho project — the extension activates automatically when it detects a `maho` file in the workspace root

## Configuration

By default, the extension auto-detects `php` on your PATH and the `maho` CLI in the workspace root. You can override this in VS Code settings:

### Custom PHP path

```json
{
  "maho.phpPath": "/usr/local/bin/php8.3"
}
```

### Custom maho CLI path

```json
{
  "maho.mahoPath": "/path/to/maho"
}
```

### Docker

```json
{
  "maho.customCommand": ["docker", "compose", "exec", "-T", "php", "php", "./maho", "dev:lsp:start"]
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

## Development

### Testing locally

1. Open this project in VS Code
2. Press `F5` to launch a new VS Code window with the extension loaded
3. In the new window, open a Maho project folder
4. The extension activates when it detects the `maho` file in the workspace root

### Building

```bash
npm install          # Install dependencies
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
```

### Publishing

```bash
npx @vscode/vsce package    # Package as .vsix
npx @vscode/vsce publish    # Publish to VS Code Marketplace
npx ovsx publish -p <token> # Publish to Open VSX Registry
```

## License

MIT
