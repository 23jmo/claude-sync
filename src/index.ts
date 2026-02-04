#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { showMainMenu, showError, showSuccess, showWarning } from "./ui/menu";
import { selectItemsToSync } from "./ui/select";
import { showDiffs } from "./ui/diff";
import { showRollbackMenu } from "./ui/rollback";
import { showStatus } from "./ui/status";
import { scanEnvironments, checkEnvironments } from "./sync/scanner";
import { compareWithManifest } from "./sync/differ";
import { loadManifest, saveManifest } from "./sync/manifest";
import { executeSync } from "./sync/executor";
import { lookupInRegistry, getRegistryInstallInstructions } from "./transform/registry";
import { getMcpServerDiff } from "./transform/mcp-config";
import type { SyncDirection, ScannedItem } from "./types";

async function main() {
  console.clear();

  p.intro(pc.bgCyan(pc.black(" claude-sync v1.0.0 ")));

  // Check both environments exist
  const envCheck = checkEnvironments();

  if (!envCheck.codeExists) {
    showError("Claude Code not found. Please ensure ~/.claude/settings.json exists.");
    p.outro("Exiting");
    process.exit(1);
  }

  if (!envCheck.desktopExists) {
    showError(
      "Claude Desktop not found. Please ensure ~/Library/Application Support/Claude/ exists."
    );
    p.outro("Exiting");
    process.exit(1);
  }

  // Load manifest for last sync info
  const manifest = loadManifest();

  // Main loop
  while (true) {
    const action = await showMainMenu(manifest.lastSync);

    switch (action) {
      case "code-to-desktop":
        await performSync("code-to-desktop");
        break;

      case "desktop-to-code":
        await performSync("desktop-to-code");
        break;

      case "status":
        await showStatus();
        await pause();
        break;

      case "rollback":
        await showRollbackMenu();
        await pause();
        break;

      case "exit":
        p.outro("Goodbye!");
        process.exit(0);
    }
  }
}

async function performSync(direction: SyncDirection) {
  const spinner = p.spinner();
  spinner.start("Scanning environments...");

  const scan = scanEnvironments();
  const manifest = loadManifest();

  spinner.stop("Scan complete");

  // Determine source and target
  const sourceItems =
    direction === "code-to-desktop" ? scan.codeItems : scan.desktopItems;
  const sourceMcpServers =
    direction === "code-to-desktop" ? scan.codeMcpServers : scan.desktopMcpServers;
  const targetMcpServers =
    direction === "code-to-desktop" ? scan.desktopMcpServers : scan.codeMcpServers;

  // Compare with manifest
  const comparisons = compareWithManifest(sourceItems, manifest, direction);

  // Get MCP server diff
  const mcpDiff = getMcpServerDiff(sourceMcpServers, targetMcpServers);
  const mcpServersToSync = [...mcpDiff.toAdd, ...mcpDiff.toUpdate];

  // Check for items that will be skipped
  const skippedItems: Array<{ id: string; reason: string }> = [];

  // For Code → Desktop, check registry and incompatibility
  if (direction === "code-to-desktop") {
    for (const item of sourceItems) {
      if (item.type === "plugin") {
        const registry = lookupInRegistry(item.name);
        if (registry.found) {
          // Will recommend registry install
        }
      }
    }
  }

  // Show diffs for modified items
  await showDiffs(comparisons);

  // Let user select items
  const selection = await selectItemsToSync(
    comparisons,
    mcpServersToSync,
    skippedItems,
    direction
  );

  if (selection.cancelled || selection.items.length === 0) {
    if (!selection.cancelled) {
      p.log.info("No items selected.");
    }
    return;
  }

  // Confirm sync
  const confirmed = await p.confirm({
    message: `Sync ${selection.items.length} item(s)?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.log.info("Sync cancelled.");
    return;
  }

  // Execute sync
  const syncSpinner = p.spinner();
  syncSpinner.start("Creating backup and syncing...");

  const result = await executeSync(
    direction,
    selection.items,
    sourceMcpServers,
    targetMcpServers
  );

  syncSpinner.stop(result.success ? "Sync complete!" : "Sync completed with errors");

  // Show results
  if (result.synced.length > 0) {
    showSuccess(`Synced ${result.synced.length} item(s)`);
    for (const id of result.synced) {
      console.log(pc.dim(`  ✓ ${id}`));
    }
  }

  if (result.skipped.length > 0) {
    showWarning(`Skipped ${result.skipped.length} item(s)`);
    for (const skip of result.skipped) {
      console.log(pc.dim(`  ⊘ ${skip.id}: ${skip.reason}`));
    }
  }

  if (result.errors.length > 0) {
    showError(`Errors: ${result.errors.length}`);
    for (const err of result.errors) {
      console.log(pc.red(`  ✗ ${err.id}: ${err.error}`));
    }
  }

  if (result.registryRecommendations.length > 0) {
    console.log();
    p.log.info(pc.cyan("Registry recommendations:"));
    for (const rec of result.registryRecommendations) {
      console.log(pc.dim(`  • ${rec.id}: Consider installing "${rec.extensionId}" from registry`));
    }
  }

  console.log();
  await pause();
}

async function pause() {
  await p.text({
    message: "Press Enter to continue...",
    placeholder: "",
  });
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
