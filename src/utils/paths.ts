import { homedir } from "os";
import { join } from "path";

export const PATHS = {
  // Claude Code paths
  claudeCode: {
    root: join(homedir(), ".claude"),
    settings: join(homedir(), ".claude", "settings.json"),
    skills: join(homedir(), ".claude", "skills"),
    plugins: join(homedir(), ".claude", "plugins"),
    installedPlugins: join(homedir(), ".claude", "plugins", "installed_plugins.json"),
    commands: join(homedir(), ".claude", "commands"),
    agents: join(homedir(), ".claude", "agents"),
  },

  // Claude Desktop paths
  claudeDesktop: {
    root: join(homedir(), "Library", "Application Support", "Claude"),
    config: join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    extensions: join(homedir(), "Library", "Application Support", "Claude", "Claude Extensions"),
    extensionsSettings: join(homedir(), "Library", "Application Support", "Claude", "Claude Extensions Settings"),
    installations: join(homedir(), "Library", "Application Support", "Claude", "extensions-installations.json"),
  },

  // claude-sync data paths
  syncData: {
    root: join(homedir(), ".claude-sync"),
    manifest: join(homedir(), ".claude-sync", "manifest.json"),
    backups: join(homedir(), ".claude-sync", "backups"),
    converted: join(homedir(), ".claude-sync", "converted"),
  },
} as const;

export function ensureDir(path: string): void {
  const fs = require("fs");
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}
