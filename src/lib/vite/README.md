# MCP Svelte Plugin - Architecture

This directory contains the modular components of the MCP Svelte Plugin.

## 🏗️ Architecture Overview

```
mcp/
├── types.ts              - TypeScript type definitions
├── constants.ts          - Configuration constants
├── logger.ts             - Logging utility
├── validators.ts         - Input validation
├── templates.ts          - Code generation templates
├── tailwind-compiler.ts  - Tailwind CSS compilation
├── component-compiler.ts - Component compilation pipeline
└── file-watcher.ts       - Hot reloading in dev mode
```

## 📦 Modules

### `types.ts`
Defines all TypeScript interfaces and types used throughout the plugin.

**Exports:**
- `MCPComponent` - Compiled component structure
- `PluginOptions` - Plugin configuration options
- `CompilationResult` - Compilation result with success/error
- `ValidationResult` - Validation outcome

### `constants.ts`
Centralized configuration values and patterns.

**Exports:**
- `PLUGIN_NAME` - Plugin identifier for Vite
- `MCP_PATTERN` - Glob pattern for .mcp.svelte files
- `DEFAULT_OUTPUT_DIR` - Default output directory
- `TEMP_DIR_NAME` - Temporary build directory
- `IGNORE_PATTERNS` - Patterns to ignore when scanning

### `logger.ts`
Emoji-enhanced logging with verbose mode support.

**Exports:**
- `MCPLogger` class with methods:
  - `info()` - Informational messages (verbose only)
  - `success()` - Success messages (always shown)
  - `warn()` - Warning messages (always shown)
  - `error()` - Error messages with optional details

### `validators.ts`
Input validation functions.

**Exports:**
- `validateComponentName()` - Ensures valid JavaScript identifiers

### `templates.ts`
Runtime code generation for component registration and mounting.

**Exports:**
- `wrapComponentForRegistration()` - Wraps code with auto-mount logic
- `generateIndexContent()` - Creates component registry index
- `generateEntryPoint()` - Generates Vite build entry point

### `tailwind-compiler.ts`
Programmatic Tailwind CSS compilation with custom plugin support.

**Exports:**
- `extractClassCandidates()` - Extracts CSS classes from component
- `compileTailwindForComponent()` - Compiles Tailwind CSS for specific classes

**Features:**
- Scans component source for class names
- Loads custom Tailwind plugins from `app.css`
- Resolves package.json exports for plugin modules
- Supports all Tailwind v4 features

### `component-compiler.ts`
Core component compilation pipeline.

**Exports:**
- `compileComponentInline()` - Main compilation function

**Pipeline:**
1. Creates temporary files for Vite build
2. Runs Vite with Svelte and Tailwind plugins
3. Extracts CSS from build output (Svelte styles + theme)
4. Compiles additional Tailwind utilities programmatically
5. Injects all CSS into JavaScript bundle
6. Wraps with auto-mount and registration code

### `file-watcher.ts` 🆕
Hot reloading support for development mode.

**Exports:**
- `handleFileChange()` - Handles file change events

**Features:**
- Watches for changes to .mcp.svelte files
- Automatically recompiles changed components
- Writes updated files to static directory
- Triggers browser reload via Vite HMR

## 🔥 Hot Reloading

In development mode (`pnpm dev`), the plugin watches for changes to `.mcp.svelte` files:

1. **File Change Detected** - Vite's `handleHotUpdate` hook catches the change
2. **Recompilation** - The changed component is immediately recompiled
3. **File Update** - The new bundle is written to `static/mcp-components/`
4. **Browser Reload** - Vite triggers a full page reload to load the new component

### How It Works

```typescript
// In dev mode, any change to Test.mcp.svelte triggers:
async handleHotUpdate({ file, server }) {
  if (file.endsWith('.mcp.svelte')) {
    // Recompile the component
    await handleFileChange(file, ...);
    
    // Reload the browser
    server.ws.send({ type: 'full-reload' });
  }
}
```

### Developer Experience

✅ **Edit** a `.mcp.svelte` file
✅ **Save** the file
✅ **See** automatic recompilation in terminal
✅ **View** changes instantly in browser (auto-reload)

## 🎨 CSS Compilation Strategy

The plugin uses a **dual CSS compilation** approach:

### 1. Build Output CSS (via Vite)
- Svelte component `<style>` blocks
- Tailwind theme variables and base styles
- Custom Tailwind plugin setup from `app.css`

### 2. Programmatic CSS (via Tailwind Compiler)
- Utility classes extracted from component source
- Compiled with custom plugins (e.g., svelai)
- Only includes classes actually used

### Combined Result
Both CSS outputs are combined and injected into the component bundle:

```javascript
// Final bundle structure:
var __mcp_ComponentName = (function(exports) {
  // Inject component CSS
  (function() {
    var style = document.createElement('style');
    style.textContent = "/* Combined CSS here */";
    document.head.appendChild(style);
  })();
  
  // Svelte component code...
})();
```

## 🔧 Configuration

The plugin can be configured via `PluginOptions`:

```typescript
mcpSveltePlugin({
  outputDir: 'mcp-components',  // Output directory
  verbose: true                  // Enable verbose logging
})
```

## 🚀 Usage Example

```svelte
<!-- src/lib/MyComponent.mcp.svelte -->
<script lang="ts">
  let { message = 'Hello!' } = $props();
</script>

<div class="p-4 bg-blue-500 text-white rounded-lg">
  {message}
</div>
```

**Result:** A self-contained JavaScript bundle at:
- **Dev:** `static/mcp-components/MyComponent.js`
- **Prod:** `.svelte-kit/output/client/mcp-components/MyComponent.js`

**Load in browser:**
```html
<script src="/mcp-components/MyComponent.js"></script>
<!-- Component auto-mounts to #MyComponent or document.body -->
```

## 📝 Best Practices

1. **Use Tailwind classes** - They'll be automatically compiled and inlined
2. **Install custom plugins** - Define them in `src/app.css` with `@plugin`
3. **Keep components focused** - Each .mcp.svelte should be independent
4. **Test in dev mode** - Use hot reloading for rapid iteration
5. **Check bundle size** - Enable verbose logging to see CSS sizes

## 🐛 Debugging

Enable verbose mode to see detailed compilation logs:

```typescript
mcpSveltePlugin({ verbose: true })
```

You'll see:
- 📝 File change detection
- 🔄 Recompilation progress
- ℹ️  CSS extraction sizes
- ✅ Successful injections
- ⚠️  Warnings and errors
