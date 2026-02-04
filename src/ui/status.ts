import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadManifest } from "../sync/manifest";
import { scanEnvironments, checkEnvironments } from "../sync/scanner";
import { formatTimestamp } from "./menu";

export async function showStatus(): Promise<void> {
  const manifest = loadManifest();
  const envCheck = checkEnvironments();

  console.log();
  p.log.info(pc.bold("Environment Status:"));
  console.log();

  // Check environments
  console.log(
    `  Claude Code:    ${envCheck.codeExists ? pc.green("✓ Found") : pc.red("✗ Not found")}`
  );
  console.log(
    `  Claude Desktop: ${envCheck.desktopExists ? pc.green("✓ Found") : pc.red("✗ Not found")}`
  );

  if (!envCheck.codeExists || !envCheck.desktopExists) {
    console.log();
    p.log.warn("Both Claude Code and Claude Desktop must be configured to sync.");
    return;
  }

  // Scan environments
  const spinner = p.spinner();
  spinner.start("Scanning environments...");

  const scan = scanEnvironments();

  spinner.stop("Scan complete");

  console.log();
  p.log.info(pc.bold("Found Items:"));
  console.log();

  // Claude Code items
  console.log(pc.bold("  Claude Code:"));
  const skills = scan.codeItems.filter((i) => i.type === "skill");
  const plugins = scan.codeItems.filter((i) => i.type === "plugin");
  console.log(`    ${pc.dim("•")} ${skills.length} skill${skills.length === 1 ? "" : "s"}`);
  console.log(`    ${pc.dim("•")} ${plugins.length} plugin${plugins.length === 1 ? "" : "s"}`);
  console.log(`    ${pc.dim("•")} ${scan.codeMcpServers.size} MCP server${scan.codeMcpServers.size === 1 ? "" : "s"}`);

  console.log();

  // Claude Desktop items
  console.log(pc.bold("  Claude Desktop:"));
  console.log(
    `    ${pc.dim("•")} ${scan.desktopItems.length} extension${scan.desktopItems.length === 1 ? "" : "s"}`
  );
  console.log(
    `    ${pc.dim("•")} ${scan.desktopMcpServers.size} MCP server${scan.desktopMcpServers.size === 1 ? "" : "s"}`
  );

  console.log();

  // Sync status
  p.log.info(pc.bold("Sync Status:"));
  console.log();

  if (manifest.lastSync) {
    console.log(`  Last sync: ${formatTimestamp(manifest.lastSync)}`);
  } else {
    console.log(`  ${pc.dim("No syncs performed yet")}`);
  }

  const syncedItems = Object.values(manifest.items).filter(
    (i) => i.status === "synced"
  );
  console.log(`  Synced items: ${syncedItems.length}`);

  const backupCount = manifest.backups.length;
  console.log(`  Backups: ${backupCount}`);

  console.log();
}

export function showScanSummary(
  codeCount: number,
  desktopCount: number,
  codeMcpCount: number,
  desktopMcpCount: number
): void {
  p.log.info(
    `Found: ${pc.bold(codeCount.toString())} Code items, ${pc.bold(desktopCount.toString())} Desktop items, ${pc.bold((codeMcpCount + desktopMcpCount).toString())} MCP servers`
  );
}
