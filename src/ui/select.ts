import * as p from "@clack/prompts";
import pc from "picocolors";
import type { ScannedItem, McpServerConfig } from "../types";
import type { ComparisonResult } from "../sync/differ";

export interface SelectionResult {
  items: ScannedItem[];
  mcpServers: Map<string, McpServerConfig>;
  cancelled: boolean;
}

export async function selectItemsToSync(
  comparisons: ComparisonResult[],
  mcpServersToSync: string[],
  skippedItems: Array<{ id: string; reason: string }>,
  direction: "code-to-desktop" | "desktop-to-code"
): Promise<SelectionResult> {
  const directionLabel =
    direction === "code-to-desktop" ? "Code → Desktop" : "Desktop → Code";

  // Build options for multi-select
  const options: Array<{
    value: string;
    label: string;
    hint?: string;
  }> = [];

  // Add items
  for (const comparison of comparisons) {
    if (comparison.status === "unchanged") continue;

    const statusBadge = getStatusBadge(comparison.status);
    const linkedHint = comparison.linkedItem
      ? " (will link to existing)"
      : "";

    options.push({
      value: comparison.item.id,
      label: `${statusBadge} ${comparison.item.displayName}`,
      hint: `${comparison.item.type}${linkedHint}`,
    });
  }

  // Add MCP servers
  for (const serverName of mcpServersToSync) {
    options.push({
      value: `mcp:${serverName}`,
      label: `${pc.blue("●")} ${serverName}`,
      hint: "MCP server",
    });
  }

  if (options.length === 0) {
    p.log.info("No items to sync - everything is up to date!");
    return { items: [], mcpServers: new Map(), cancelled: false };
  }

  // Show skipped items as warnings
  if (skippedItems.length > 0) {
    p.log.warn(pc.yellow(`\n⚠ Skipped (incompatible):`));
    for (const skipped of skippedItems) {
      console.log(pc.dim(`  - ${skipped.id}: ${skipped.reason}`));
    }
    console.log();
  }

  const selected = await p.multiselect({
    message: `Select items to sync (${directionLabel})`,
    options,
    initialValues: options.map((o) => o.value), // Pre-select all by default
    required: false,
  });

  if (p.isCancel(selected)) {
    return { items: [], mcpServers: new Map(), cancelled: true };
  }

  const selectedSet = new Set(selected as string[]);

  // Filter selected items
  const selectedItems = comparisons
    .filter((c) => selectedSet.has(c.item.id))
    .map((c) => c.item);

  // Filter selected MCP servers
  const selectedMcpServers = new Map<string, McpServerConfig>();
  // Note: MCP server configs would need to be passed in for this to work fully

  return {
    items: selectedItems,
    mcpServers: selectedMcpServers,
    cancelled: false,
  };
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "new":
      return pc.green("●");
    case "modified":
      return pc.yellow("●");
    case "removed":
      return pc.red("●");
    default:
      return pc.dim("○");
  }
}

export function formatItemList(items: ScannedItem[]): string {
  return items.map((item) => `  - ${item.displayName} (${item.type})`).join("\n");
}
