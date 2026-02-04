import { existsSync, readFileSync, writeFileSync } from "fs";
import { PATHS } from "../utils/paths";
import type { McpServerConfig } from "../types";

export function syncMcpServers(
  direction: "code-to-desktop" | "desktop-to-code",
  servers: Map<string, McpServerConfig>
): { synced: string[]; errors: string[] } {
  const synced: string[] = [];
  const errors: string[] = [];

  if (direction === "code-to-desktop") {
    const result = addMcpServersToDesktop(servers);
    synced.push(...result.synced);
    errors.push(...result.errors);
  } else {
    const result = addMcpServersToCode(servers);
    synced.push(...result.synced);
    errors.push(...result.errors);
  }

  return { synced, errors };
}

function addMcpServersToDesktop(
  servers: Map<string, McpServerConfig>
): { synced: string[]; errors: string[] } {
  const synced: string[] = [];
  const errors: string[] = [];

  const configPath = PATHS.claudeDesktop.config;

  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch (e) {
      errors.push(`Failed to parse Desktop config: ${e}`);
      return { synced, errors };
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const mcpServers = config.mcpServers as Record<string, McpServerConfig>;

  for (const [name, serverConfig] of servers) {
    try {
      mcpServers[name] = serverConfig;
      synced.push(name);
    } catch (e) {
      errors.push(`Failed to add ${name}: ${e}`);
    }
  }

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    errors.push(`Failed to write Desktop config: ${e}`);
  }

  return { synced, errors };
}

function addMcpServersToCode(
  servers: Map<string, McpServerConfig>
): { synced: string[]; errors: string[] } {
  const synced: string[] = [];
  const errors: string[] = [];

  const settingsPath = PATHS.claudeCode.settings;

  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch (e) {
      errors.push(`Failed to parse Code settings: ${e}`);
      return { synced, errors };
    }
  }

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  const mcpServers = settings.mcpServers as Record<string, McpServerConfig>;

  for (const [name, serverConfig] of servers) {
    try {
      mcpServers[name] = serverConfig;
      synced.push(name);
    } catch (e) {
      errors.push(`Failed to add ${name}: ${e}`);
    }
  }

  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    errors.push(`Failed to write Code settings: ${e}`);
  }

  return { synced, errors };
}

export function getMcpServerDiff(
  sourceServers: Map<string, McpServerConfig>,
  targetServers: Map<string, McpServerConfig>
): { toAdd: string[]; toUpdate: string[]; existing: string[] } {
  const toAdd: string[] = [];
  const toUpdate: string[] = [];
  const existing: string[] = [];

  for (const [name, config] of sourceServers) {
    if (!targetServers.has(name)) {
      toAdd.push(name);
    } else {
      const targetConfig = targetServers.get(name)!;
      if (JSON.stringify(config) !== JSON.stringify(targetConfig)) {
        toUpdate.push(name);
      } else {
        existing.push(name);
      }
    }
  }

  return { toAdd, toUpdate, existing };
}
