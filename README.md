# claude-sync

Sync skills, plugins, and extensions between Claude Code and Claude Desktop.

## Installation

Run directly without installing:

```bash
bunx claude-sync
```

Or install globally:

```bash
bun install -g claude-sync
```

## Features

- **Bidirectional sync**: Choose to sync Code → Desktop or Desktop → Code
- **Format transformation**: Automatically converts between Claude Code skills/plugins and Desktop DXT extensions
- **MCP server sync**: Syncs MCP server configurations between both apps
- **Registry lookup**: Checks for official DXT extensions before converting locally
- **Interactive UI**: Beautiful CLI with checkboxes for selecting what to sync
- **Diff preview**: Shows what changed since the last sync
- **Auto-backup**: Creates timestamped backups before every sync
- **Rollback**: Restore from any previous backup

## Usage

Simply run:

```bash
bunx claude-sync
```

You'll see an interactive menu:

```
┌  claude-sync v1.0.0
│
◆  What would you like to do?
│  ● Sync Code → Desktop
│  ○ Sync Desktop → Code
│  ○ View sync status
│  ○ View history / Rollback
│  ○ Exit
└
```

### Sync Flow

1. Select sync direction
2. Review changes (new, modified, removed items)
3. Select items to sync with checkboxes
4. Confirm sync
5. Backup is automatically created
6. Items are synced

### What Gets Synced

| Claude Code | → | Claude Desktop |
|-------------|---|----------------|
| Skills (`~/.claude/skills/`) | → | DXT Extensions |
| Plugins | → | DXT Extensions (or registry install) |
| MCP Servers | ↔ | MCP Servers |

| Claude Desktop | → | Claude Code |
|----------------|---|-------------|
| DXT Extensions | → | Skills + MCP config |
| MCP Servers | ↔ | MCP Servers |

### Incompatible Items

Some Claude Code features don't have Desktop equivalents and will be skipped:
- Skills using subagents
- Skills using hooks
- Custom agent definitions

You'll see a warning for any skipped items.

## Data Storage

Sync data is stored in `~/.claude-sync/`:

```
~/.claude-sync/
├── manifest.json      # Sync state and history
├── backups/           # Timestamped backups
│   └── 2024-02-03T19-45-00/
│       ├── claude-code/
│       └── claude-desktop/
└── converted/         # Generated artifacts
```

## Development

```bash
# Clone and install
git clone <repo>
cd claude-sync
bun install

# Run in development
bun run dev

# Build for distribution
bun run build
```

## License

MIT
