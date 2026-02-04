import { existsSync, cpSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { PATHS } from "../utils/paths";
import type { BackupRecord } from "../types";

export interface RestoreResult {
  success: boolean;
  error?: string;
  restoredItems: string[];
}

export function restoreBackup(backup: BackupRecord): RestoreResult {
  const restoredItems: string[] = [];

  try {
    const backupDir = backup.path;

    if (!existsSync(backupDir)) {
      return {
        success: false,
        error: `Backup directory not found: ${backupDir}`,
        restoredItems: [],
      };
    }

    // Restore Claude Code configs
    const codeSettingsBackup = join(backupDir, "claude-code", "settings.json");
    if (existsSync(codeSettingsBackup)) {
      cpSync(codeSettingsBackup, PATHS.claudeCode.settings);
      restoredItems.push("Claude Code settings");
    }

    const codeSkillsBackup = join(backupDir, "claude-code", "skills");
    if (existsSync(codeSkillsBackup)) {
      // Remove current skills and restore from backup
      if (existsSync(PATHS.claudeCode.skills)) {
        rmSync(PATHS.claudeCode.skills, { recursive: true });
      }
      cpSync(codeSkillsBackup, PATHS.claudeCode.skills, { recursive: true });
      restoredItems.push("Claude Code skills");
    }

    // Restore Claude Desktop configs
    const desktopConfigBackup = join(
      backupDir,
      "claude-desktop",
      "claude_desktop_config.json"
    );
    if (existsSync(desktopConfigBackup)) {
      cpSync(desktopConfigBackup, PATHS.claudeDesktop.config);
      restoredItems.push("Claude Desktop config");
    }

    const desktopInstallationsBackup = join(
      backupDir,
      "claude-desktop",
      "extensions-installations.json"
    );
    if (existsSync(desktopInstallationsBackup)) {
      cpSync(desktopInstallationsBackup, PATHS.claudeDesktop.installations);
      restoredItems.push("Claude Desktop extensions list");
    }

    const desktopExtensionsBackup = join(
      backupDir,
      "claude-desktop",
      "extensions"
    );
    if (existsSync(desktopExtensionsBackup)) {
      if (existsSync(PATHS.claudeDesktop.extensions)) {
        rmSync(PATHS.claudeDesktop.extensions, { recursive: true });
      }
      cpSync(desktopExtensionsBackup, PATHS.claudeDesktop.extensions, {
        recursive: true,
      });
      restoredItems.push("Claude Desktop extensions");
    }

    return {
      success: true,
      restoredItems,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
      restoredItems,
    };
  }
}

export function listBackups(): BackupRecord[] {
  const { readdirSync } = require("fs");
  const backups: BackupRecord[] = [];

  if (!existsSync(PATHS.syncData.backups)) {
    return backups;
  }

  const dirs = readdirSync(PATHS.syncData.backups);

  for (const dir of dirs) {
    const metadataPath = join(PATHS.syncData.backups, dir, "metadata.json");
    if (existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf-8"));
        backups.push({
          timestamp: metadata.timestamp,
          path: join(PATHS.syncData.backups, dir),
          direction: metadata.direction,
          itemsSynced: metadata.itemIds || [],
        });
      } catch {
        // Skip invalid backup
      }
    }
  }

  // Sort by timestamp descending
  backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return backups;
}
