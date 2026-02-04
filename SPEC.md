# claude-sync Specification

A CLI tool to synchronize skills, plugins, extensions, and MCP servers between Claude Code and Claude Desktop.

## Overview

**Name:** `claude-sync`
**Runtime:** Bun (TypeScript)
**Distribution:** `bunx claude-sync` (published to npm)
**UI Library:** Clack (modern CLI prompts)
**Data Directory:** `~/.claude-sync/`

## Core Features

### Sync Direction
- User chooses direction per run via interactive menu
- Options: Code → Desktop, Desktop → Code
- Bidirectional not supported (pick one direction per sync)

### Format Transformation
The CLI automatically transforms between formats:

| Claude Code | Claude Desktop |
|-------------|----------------|
| Skills (markdown SKILL.md) | DXT Extensions (manifest + server) |
| Plugins | DXT Extensions |
| MCP server configs | MCP server configs |
| Commands | DXT prompts array |

### Registry Lookup
When syncing Code → Desktop:
- First check if an official DXT extension exists in Anthropic registry
- If found, prompt user to install from registry instead of converting
- If not found, perform local conversion

### Incompatible Items
- Items that can't be converted (subagents, hooks, complex tool dependencies) are **skipped with warning**
- Log explains why each item was skipped

## Installation & Output

### Installation
```bash
bunx claude-sync
```

### Data Storage
```
~/.claude-sync/
├── manifest.json      # Sync state, versions, timestamps
├── backups/           # Timestamped backups before each sync
│   ├── 2024-02-03T19-45-00/
│   │   ├── claude-code/
│   │   └── claude-desktop/
│   └── ...
└── converted/         # Generated DXT packages and skill conversions
```

### Direct Installation
Converted artifacts are installed directly to target app directories:
- Desktop: `~/Library/Application Support/Claude/Claude Extensions/`
- Code: `~/.claude/skills/`, `~/.claude/plugins/`, `~/.claude/settings.json`

## Interactive UI Flow

### Main Menu
```
┌  claude-sync
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
1. **Scan** both environments
2. **Show diff** of what changed since last sync
3. **Display items** with checkboxes for multi-select
4. **Confirm** selection
5. **Auto-backup** before making changes
6. **Execute** sync with progress indicator
7. **Update manifest** with new state

### Selection UI
```
┌  Select items to sync (Code → Desktop)
│
◆  Skills & Plugins
│  ◼ humanizer (modified)
│  ◼ interview (new)
│  ◻ prompt-book (unchanged)
│  ◼ techdebt (new)
│
◆  MCP Servers
│  ◼ context7 (will link to existing)
│  ◼ playwright (new)
│
│  ⚠ Skipped (incompatible):
│  - ralph-loop (requires subagent)
│  - feature-dev (requires custom agents)
│
└  Press space to toggle, enter to confirm
```

### Diff Preview
Always show diff for modified items before sync:
```
┌  Changes in 'humanizer'
│
│  - version: 1.0.0
│  + version: 1.1.0
│
│  + Added new detection pattern for em-dash overuse
│
└
```

## Transformation Details

### Skill → DXT Extension

**Input:** `~/.claude/skills/humanizer/SKILL.md`

**Output:** DXT package structure
```
humanizer/
├── manifest.json       # Auto-generated DXT manifest
├── icon.png            # Auto-generated placeholder
├── server/
│   └── index.js        # MCP server wrapper
└── README.md           # From skill if exists
```

**Manifest generation:**
- `name`: from skill directory name
- `display_name`: from SKILL.md title or directory name
- `description`: from SKILL.md first paragraph
- `version`: "1.0.0" or from manifest if exists
- `prompts`: extracted from SKILL.md content
- `tools`: none (skills are prompt-based)
- `icon`: auto-generated placeholder (colored square with initials)

### DXT Extension → Claude Code

**Input:** DXT extension with MCP server

**Output:**
1. MCP server config added to `~/.claude/settings.json`
2. If extension has prompts, create skill wrapper in `~/.claude/skills/`

### MCP Server Config Sync

**Code format** (`~/.claude/settings.json`):
```json
{
  "mcpServers": {
    "context7": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

**Desktop format** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "context7": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

These are nearly identical - sync directly with path adjustments if needed.

## Manifest Schema

```typescript
interface SyncManifest {
  version: 1;
  lastSync: string;  // ISO timestamp

  items: {
    [id: string]: {
      type: 'skill' | 'plugin' | 'extension' | 'mcp-server';
      name: string;

      // Source info
      sourceApp: 'code' | 'desktop';
      sourcePath: string;
      sourceHash: string;

      // Target info (if synced)
      targetApp?: 'code' | 'desktop';
      targetPath?: string;
      targetHash?: string;

      // Registry info (if from official registry)
      registryId?: string;
      registryVersion?: string;

      // Sync state
      status: 'synced' | 'modified' | 'new' | 'removed' | 'skipped';
      lastSynced?: string;
      skipReason?: string;

      // Linking (for items that exist in both)
      linkedTo?: string;  // ID of linked item
    }
  };

  backups: {
    timestamp: string;
    path: string;
    direction: 'code-to-desktop' | 'desktop-to-code';
    itemsSynced: string[];
  }[];
}
```

## Backup & Rollback

### Auto-Backup
Before every sync:
1. Create timestamped directory in `~/.claude-sync/backups/`
2. Copy affected files from both apps
3. Store metadata about what will change

### Rollback Flow
```
┌  Select backup to restore
│
◆  Available backups
│  ● 2024-02-03 19:45 - Code → Desktop (3 items)
│  ○ 2024-02-02 14:30 - Desktop → Code (1 item)
│  ○ 2024-02-01 09:15 - Code → Desktop (5 items)
│
└  This will restore files to their state before that sync
```

## Symlink Handling

Skills that are symlinks (e.g., `remotion-best-practices -> ~/.agents/skills/...`):
- **Follow the symlink** and sync the actual content
- Do not preserve symlink structure in target

## Duplicate Detection

When an item exists in both apps independently (like Context7):
- Detect by name matching
- **Link them** in the manifest
- Track as a synced pair going forward
- Show as "will link to existing" in UI

## Error Handling

### Missing App
If Claude Desktop or Claude Code config directories don't exist:
- Error and exit with clear message
- Suggest how to install/configure the missing app

### Conversion Failures
If a skill/extension can't be converted:
- Skip with warning
- Log detailed reason
- Continue with other items

## File Structure

```
claude-sync/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point, CLI setup
│   ├── ui/
│   │   ├── menu.ts           # Main menu
│   │   ├── select.ts         # Item selection
│   │   ├── diff.ts           # Diff display
│   │   └── rollback.ts       # Rollback UI
│   ├── sync/
│   │   ├── scanner.ts        # Scan both environments
│   │   ├── differ.ts         # Compare and detect changes
│   │   ├── executor.ts       # Perform sync operations
│   │   └── manifest.ts       # Manifest read/write
│   ├── transform/
│   │   ├── skill-to-dxt.ts   # Skill → DXT conversion
│   │   ├── dxt-to-skill.ts   # DXT → Skill conversion
│   │   ├── mcp-config.ts     # MCP server config sync
│   │   └── registry.ts       # Registry lookup
│   ├── backup/
│   │   ├── create.ts         # Create backups
│   │   └── restore.ts        # Restore from backup
│   └── utils/
│       ├── paths.ts          # Path constants and helpers
│       ├── hash.ts           # File hashing
│       └── icon.ts           # Placeholder icon generation
├── assets/
│   └── placeholder-icon.png  # Default icon template
└── README.md
```

## Dependencies

```json
{
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "picocolors": "^1.0.0",
    "diff": "^5.1.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/diff": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Usage Examples

### First Run
```bash
$ bunx claude-sync

┌  claude-sync v1.0.0
│
│  First time setup - scanning environments...
│
│  Found:
│  • Claude Code: 8 plugins, 7 skills, 2 MCP servers
│  • Claude Desktop: 6 extensions
│
◆  What would you like to do?
│  ● Sync Code → Desktop
│  ...
```

### Subsequent Run
```bash
$ bunx claude-sync

┌  claude-sync v1.0.0
│
│  Last sync: 2 hours ago (Code → Desktop)
│
│  Changes detected:
│  • 2 skills modified in Claude Code
│  • 1 new extension in Claude Desktop
│
◆  What would you like to do?
│  ...
```
