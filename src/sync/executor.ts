import type { ScannedItem, SyncManifest, SyncDirection, SyncItem } from "../types";
import { convertSkillToDxt } from "../transform/skill-to-dxt";
import { convertDxtToSkill, addMcpServerToSettings } from "../transform/dxt-to-skill";
import { syncMcpServers, getMcpServerDiff } from "../transform/mcp-config";
import { lookupInRegistry } from "../transform/registry";
import { createBackup, toBackupRecord } from "../backup/create";
import { loadManifest, saveManifest, updateItem, addBackup } from "./manifest";
import type { McpServerConfig } from "../types";

export interface SyncResult {
  success: boolean;
  synced: string[];
  skipped: Array<{ id: string; reason: string }>;
  errors: Array<{ id: string; error: string }>;
  registryRecommendations: Array<{ id: string; extensionId: string }>;
}

export async function executeSync(
  direction: SyncDirection,
  selectedItems: ScannedItem[],
  mcpServers: Map<string, McpServerConfig>,
  targetMcpServers: Map<string, McpServerConfig>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: [],
    skipped: [],
    errors: [],
    registryRecommendations: [],
  };

  // Load manifest
  let manifest = loadManifest();

  // Create backup before making changes
  const itemIds = selectedItems.map((item) => item.id);
  const backupResult = createBackup(direction, itemIds);

  if (!backupResult.success) {
    result.errors.push({
      id: "backup",
      error: backupResult.error || "Failed to create backup",
    });
    result.success = false;
    return result;
  }

  // Add backup record to manifest
  manifest = addBackup(
    manifest,
    toBackupRecord(backupResult, direction, itemIds)
  );

  // Sync each item
  for (const item of selectedItems) {
    try {
      if (direction === "code-to-desktop") {
        // Check registry first for plugins
        if (item.type === "plugin") {
          const registryResult = lookupInRegistry(item.name);
          if (registryResult.found && registryResult.recommendInstallFromRegistry) {
            result.registryRecommendations.push({
              id: item.id,
              extensionId: registryResult.extensionId!,
            });
            // Still sync but note the recommendation
          }
        }

        // Convert skill/plugin to DXT
        if (item.type === "skill") {
          const conversionResult = convertSkillToDxt(item);

          if (conversionResult.skipped) {
            result.skipped.push({
              id: item.id,
              reason: conversionResult.skipReason || "Unknown",
            });
            continue;
          }

          if (!conversionResult.success) {
            result.errors.push({
              id: item.id,
              error: conversionResult.error || "Conversion failed",
            });
            continue;
          }

          // Update manifest
          const syncItem: SyncItem = {
            id: item.id,
            type: item.type,
            name: item.name,
            displayName: item.displayName,
            sourceApp: "code",
            sourcePath: item.path,
            sourceHash: item.hash,
            targetApp: "desktop",
            targetPath: conversionResult.outputPath,
            status: "synced",
            lastSynced: new Date().toISOString(),
          };

          manifest = updateItem(manifest, syncItem);
          result.synced.push(item.id);
        }
      } else {
        // Desktop to Code
        if (item.type === "extension") {
          const conversionResult = convertDxtToSkill(item);

          if (conversionResult.skipped) {
            result.skipped.push({
              id: item.id,
              reason: conversionResult.skipReason || "Unknown",
            });
            continue;
          }

          if (!conversionResult.success) {
            result.errors.push({
              id: item.id,
              error: conversionResult.error || "Conversion failed",
            });
            continue;
          }

          // Add MCP server config if present
          if (conversionResult.mcpConfig) {
            addMcpServerToSettings(
              conversionResult.mcpConfig.name,
              conversionResult.mcpConfig.config
            );
          }

          // Update manifest
          const syncItem: SyncItem = {
            id: item.id,
            type: item.type,
            name: item.name,
            displayName: item.displayName,
            sourceApp: "desktop",
            sourcePath: item.path,
            sourceHash: item.hash,
            targetApp: "code",
            targetPath: conversionResult.skillPath,
            status: "synced",
            lastSynced: new Date().toISOString(),
          };

          manifest = updateItem(manifest, syncItem);
          result.synced.push(item.id);
        }
      }
    } catch (error) {
      result.errors.push({
        id: item.id,
        error: String(error),
      });
    }
  }

  // Sync MCP servers
  const mcpDiff = getMcpServerDiff(mcpServers, targetMcpServers);
  const serversToSync = new Map<string, McpServerConfig>();

  for (const name of [...mcpDiff.toAdd, ...mcpDiff.toUpdate]) {
    const config = mcpServers.get(name);
    if (config) {
      serversToSync.set(name, config);
    }
  }

  if (serversToSync.size > 0) {
    const mcpResult = syncMcpServers(direction, serversToSync);
    result.synced.push(...mcpResult.synced.map((s) => `mcp:${s}`));

    for (const error of mcpResult.errors) {
      result.errors.push({ id: "mcp", error });
    }
  }

  // Update manifest with sync time
  manifest.lastSync = new Date().toISOString();
  saveManifest(manifest);

  // Set overall success based on errors
  result.success = result.errors.length === 0;

  return result;
}
