import * as p from "@clack/prompts";
import pc from "picocolors";
import { listBackups, restoreBackup } from "../backup/restore";
import { formatTimestamp } from "./menu";
import type { BackupRecord } from "../types";

export async function showRollbackMenu(): Promise<boolean> {
  const backups = listBackups();

  if (backups.length === 0) {
    p.log.info("No backups available.");
    return false;
  }

  const options = backups.map((backup) => {
    const direction =
      backup.direction === "code-to-desktop" ? "Code → Desktop" : "Desktop → Code";
    const itemCount = backup.itemsSynced.length;

    return {
      value: backup,
      label: `${formatTimestamp(backup.timestamp)} - ${direction}`,
      hint: `${itemCount} item${itemCount === 1 ? "" : "s"}`,
    };
  });

  const selected = await p.select({
    message: "Select backup to restore",
    options: [
      ...options,
      { value: null, label: pc.dim("Cancel"), hint: "Go back to main menu" },
    ],
  });

  if (p.isCancel(selected) || selected === null) {
    return false;
  }

  const backup = selected as BackupRecord;

  // Show what will be restored
  p.log.info(pc.bold("\nThis will restore:"));
  console.log(pc.dim("  - Claude Code settings and skills"));
  console.log(pc.dim("  - Claude Desktop config and extensions"));
  console.log();

  const confirmed = await p.confirm({
    message: "Restore this backup? This will overwrite current configs.",
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.log.info("Rollback cancelled.");
    return false;
  }

  const spinner = p.spinner();
  spinner.start("Restoring backup...");

  const result = restoreBackup(backup);

  if (result.success) {
    spinner.stop("Backup restored successfully!");
    p.log.success(pc.green("\nRestored:"));
    for (const item of result.restoredItems) {
      console.log(pc.dim(`  ✓ ${item}`));
    }
    return true;
  } else {
    spinner.stop("Restore failed!");
    p.log.error(pc.red(result.error || "Unknown error"));
    return false;
  }
}

export async function showBackupList(): Promise<void> {
  const backups = listBackups();

  if (backups.length === 0) {
    p.log.info("No backups available.");
    return;
  }

  console.log();
  p.log.info(pc.bold("Backup History:"));
  console.log();

  for (const backup of backups.slice(0, 10)) {
    const direction =
      backup.direction === "code-to-desktop" ? "Code → Desktop" : "Desktop → Code";
    const itemCount = backup.itemsSynced.length;

    console.log(
      `  ${pc.dim("•")} ${formatTimestamp(backup.timestamp)} - ${direction} (${itemCount} items)`
    );
  }

  if (backups.length > 10) {
    console.log(pc.dim(`  ... and ${backups.length - 10} more`));
  }

  console.log();
}
