# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Install dependencies
bun install

# Run in development (without building)
bun run dev

# Build for distribution
bun run build

# Run the built CLI
./dist/index.js
```

## Architecture

claude-sync is a CLI tool that synchronizes skills, plugins, and MCP server configurations between Claude Code (`~/.claude/`) and Claude Desktop (`~/Library/Application Support/Claude/`).

### Key Concepts

- **Sync Direction**: User picks one direction per sync (Code → Desktop or Desktop → Code). Bidirectional sync is not supported.
- **Skill Sync (Code → Desktop)**: Skills are opened directly with the Claude Desktop app (`open -a "Claude" <path>`), which handles native installation. Does NOT convert to DXT format.
- **Registry Lookup**: When syncing Code → Desktop, checks if an official DXT extension exists before converting locally.

### Module Structure

- `src/index.ts` - Entry point with main menu loop and sync orchestration
- `src/ui/` - Interactive CLI components using @clack/prompts
- `src/sync/` - Core sync logic (scanner, differ, executor, manifest)
- `src/transform/` - Format conversion (DXT → skill for desktop-to-code direction)
- `src/backup/` - Timestamped backup creation and rollback
- `src/utils/` - Path constants, file hashing, icon generation

### Data Flow

1. `scanner.ts` scans both environments for items and MCP servers
2. `differ.ts` compares current state against stored manifest
3. User selects items via `ui/select.ts`
4. `executor.ts` creates backup, transforms items, and writes to target
5. `manifest.ts` persists sync state to `~/.claude-sync/manifest.json`

### Key Types (src/types.ts)

- `SyncDirection`: "code-to-desktop" | "desktop-to-code"
- `ItemType`: "skill" | "plugin" | "extension" | "mcp-server"
- `ScannedItem`: Represents a discovered item from either environment
- `DxtManifest`: Schema for DXT extension manifest.json files
