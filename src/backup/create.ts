import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PATHS, ensureDir } from "../utils/paths";
import type { SyncDirection, BackupRecord } from "../types";

export interface BackupResult {
  success: boolean;
  backupPath: string;
  timestamp: string;
  error?: string;
}

export function createBackup(
  direction: SyncDirection,
  itemIds: string[]
): BackupResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(PATHS.syncData.backups, timestamp);

  try {
    ensureDir(backupDir);
    ensureDir(join(backupDir, "claude-code"));
    ensureDir(join(backupDir, "claude-desktop"));

    // Backup Claude Code configs
    if (existsSync(PATHS.claudeCode.settings)) {
      cpSync(
        PATHS.claudeCode.settings,
        join(backupDir, "claude-code", "settings.json")
      );
    }

    if (existsSync(PATHS.claudeCode.skills)) {
      cpSync(
        PATHS.claudeCode.skills,
        join(backupDir, "claude-code", "skills"),
        { recursive: true }
      );
    }

    // Backup Claude Desktop configs
    if (existsSync(PATHS.claudeDesktop.config)) {
      cpSync(
        PATHS.claudeDesktop.config,
        join(backupDir, "claude-desktop", "claude_desktop_config.json")
      );
    }

    if (existsSync(PATHS.claudeDesktop.installations)) {
      cpSync(
        PATHS.claudeDesktop.installations,
        join(backupDir, "claude-desktop", "extensions-installations.json")
      );
    }

    if (existsSync(PATHS.claudeDesktop.extensions)) {
      cpSync(
        PATHS.claudeDesktop.extensions,
        join(backupDir, "claude-desktop", "extensions"),
        { recursive: true }
      );
    }

    // Write metadata
    const metadata = {
      timestamp,
      direction,
      itemIds,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(
      join(backupDir, "metadata.json"),
      JSON.stringify(metadata, null, 2)
    );

    return {
      success: true,
      backupPath: backupDir,
      timestamp,
    };
  } catch (error) {
    return {
      success: false,
      backupPath: backupDir,
      timestamp,
      error: String(error),
    };
  }
}

export function toBackupRecord(
  result: BackupResult,
  direction: SyncDirection,
  itemIds: string[]
): BackupRecord {
  return {
    timestamp: result.timestamp,
    path: result.backupPath,
    direction,
    itemsSynced: itemIds,
  };
}
