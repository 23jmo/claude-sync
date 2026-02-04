import * as p from "@clack/prompts";
import pc from "picocolors";
import type { SyncDirection } from "../types";

export type MenuAction =
  | "code-to-desktop"
  | "desktop-to-code"
  | "status"
  | "rollback"
  | "exit";

export async function showMainMenu(lastSync?: string): Promise<MenuAction> {
  const lastSyncText = lastSync
    ? `Last sync: ${formatTimestamp(lastSync)}`
    : "No previous syncs";

  p.note(lastSyncText, "claude-sync");

  const action = await p.select({
    message: "What would you like to do?",
    options: [
      {
        value: "code-to-desktop" as const,
        label: "Sync Code → Desktop",
        hint: "Push Claude Code skills/plugins to Desktop",
      },
      {
        value: "desktop-to-code" as const,
        label: "Sync Desktop → Code",
        hint: "Push Desktop extensions to Claude Code",
      },
      {
        value: "status" as const,
        label: "View sync status",
        hint: "See what's synced and what's changed",
      },
      {
        value: "rollback" as const,
        label: "View history / Rollback",
        hint: "Restore from a previous backup",
      },
      {
        value: "exit" as const,
        label: "Exit",
      },
    ],
  });

  if (p.isCancel(action)) {
    return "exit";
  }

  return action;
}

export async function confirmSync(
  direction: SyncDirection,
  itemCount: number
): Promise<boolean> {
  const directionText =
    direction === "code-to-desktop" ? "Code → Desktop" : "Desktop → Code";

  const confirmed = await p.confirm({
    message: `Sync ${itemCount} item(s) ${directionText}?`,
  });

  if (p.isCancel(confirmed)) {
    return false;
  }

  return confirmed;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

export function showError(message: string): void {
  p.log.error(pc.red(message));
}

export function showSuccess(message: string): void {
  p.log.success(pc.green(message));
}

export function showWarning(message: string): void {
  p.log.warn(pc.yellow(message));
}

export function showInfo(message: string): void {
  p.log.info(message);
}
