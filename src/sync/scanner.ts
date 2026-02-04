import { existsSync, readFileSync, readdirSync, statSync, realpathSync } from "fs";
import { join, basename } from "path";
import { PATHS } from "../utils/paths";
import { hashDirectory, hashFile, hashString } from "../utils/hash";
import type { ScannedItem, DxtManifest, McpServerConfig } from "../types";

export interface ScanResult {
  codeItems: ScannedItem[];
  desktopItems: ScannedItem[];
  codeMcpServers: Map<string, McpServerConfig>;
  desktopMcpServers: Map<string, McpServerConfig>;
}

export function scanEnvironments(): ScanResult {
  return {
    codeItems: scanClaudeCode(),
    desktopItems: scanClaudeDesktop(),
    codeMcpServers: scanCodeMcpServers(),
    desktopMcpServers: scanDesktopMcpServers(),
  };
}

function scanClaudeCode(): ScannedItem[] {
  const items: ScannedItem[] = [];

  // Scan skills
  if (existsSync(PATHS.claudeCode.skills)) {
    const skillDirs = readdirSync(PATHS.claudeCode.skills);
    for (const dir of skillDirs) {
      if (dir.startsWith(".")) continue;
      const skillPath = join(PATHS.claudeCode.skills, dir);
      const stat = statSync(skillPath);

      if (stat.isDirectory() || stat.isSymbolicLink()) {
        // Follow symlinks
        const realPath = stat.isSymbolicLink() ? realpathSync(skillPath) : skillPath;

        if (existsSync(realPath) && statSync(realPath).isDirectory()) {
          const skillMd = join(realPath, "SKILL.md");
          if (existsSync(skillMd)) {
            items.push({
              id: `skill:${dir}`,
              type: "skill",
              name: dir,
              displayName: extractSkillDisplayName(skillMd) || dir,
              path: skillPath,
              hash: hashDirectory(realPath),
              app: "code",
              metadata: {
                hasReadme: existsSync(join(realPath, "README.md")),
                isSymlink: stat.isSymbolicLink(),
                realPath: stat.isSymbolicLink() ? realPath : undefined,
              },
            });
          }
        }
      }
    }
  }

  // Scan enabled plugins
  if (existsSync(PATHS.claudeCode.settings)) {
    try {
      const settings = JSON.parse(readFileSync(PATHS.claudeCode.settings, "utf-8"));
      const enabledPlugins = settings.enabledPlugins || {};

      for (const [pluginId, enabled] of Object.entries(enabledPlugins)) {
        if (!enabled) continue;

        const [name, marketplace] = pluginId.split("@");
        const pluginInfo = getPluginInfo(name, marketplace);

        if (pluginInfo) {
          items.push({
            id: `plugin:${name}`,
            type: "plugin",
            name,
            displayName: name,
            path: pluginInfo.path,
            hash: pluginInfo.hash,
            app: "code",
            metadata: {
              marketplace,
              version: pluginInfo.version,
            },
          });
        }
      }
    } catch {
      // Settings file parsing error
    }
  }

  return items;
}

function scanClaudeDesktop(): ScannedItem[] {
  const items: ScannedItem[] = [];

  // Scan extensions from installations file
  if (existsSync(PATHS.claudeDesktop.installations)) {
    try {
      const installations = JSON.parse(
        readFileSync(PATHS.claudeDesktop.installations, "utf-8")
      );
      const extensions = installations.extensions || {};

      for (const [extId, extData] of Object.entries(extensions)) {
        const ext = extData as {
          id: string;
          version: string;
          hash: string;
          manifest: DxtManifest;
        };

        const extPath = join(PATHS.claudeDesktop.extensions, extId);

        items.push({
          id: `extension:${extId}`,
          type: "extension",
          name: extId,
          displayName: ext.manifest?.display_name || ext.manifest?.name || extId,
          path: extPath,
          hash: ext.hash || hashString(JSON.stringify(ext)),
          app: "desktop",
          metadata: {
            version: ext.version,
            manifest: ext.manifest,
          },
        });
      }
    } catch {
      // Installations file parsing error
    }
  }

  return items;
}

function scanCodeMcpServers(): Map<string, McpServerConfig> {
  const servers = new Map<string, McpServerConfig>();

  if (existsSync(PATHS.claudeCode.settings)) {
    try {
      const settings = JSON.parse(readFileSync(PATHS.claudeCode.settings, "utf-8"));
      const mcpServers = settings.mcpServers || {};

      for (const [name, config] of Object.entries(mcpServers)) {
        servers.set(name, config as McpServerConfig);
      }
    } catch {
      // Settings file parsing error
    }
  }

  return servers;
}

function scanDesktopMcpServers(): Map<string, McpServerConfig> {
  const servers = new Map<string, McpServerConfig>();

  if (existsSync(PATHS.claudeDesktop.config)) {
    try {
      const config = JSON.parse(readFileSync(PATHS.claudeDesktop.config, "utf-8"));
      const mcpServers = config.mcpServers || {};

      for (const [name, serverConfig] of Object.entries(mcpServers)) {
        servers.set(name, serverConfig as McpServerConfig);
      }
    } catch {
      // Config file parsing error
    }
  }

  return servers;
}

function extractSkillDisplayName(skillMdPath: string): string | undefined {
  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

function getPluginInfo(
  name: string,
  marketplace: string
): { path: string; hash: string; version: string } | undefined {
  if (!existsSync(PATHS.claudeCode.installedPlugins)) {
    return undefined;
  }

  try {
    const installed = JSON.parse(
      readFileSync(PATHS.claudeCode.installedPlugins, "utf-8")
    );
    const plugins = installed.plugins || {};
    const pluginKey = `${name}@${marketplace}`;
    const pluginData = plugins[pluginKey];

    if (pluginData && pluginData.length > 0) {
      const latest = pluginData[0];
      return {
        path: latest.installPath,
        hash: latest.gitCommitSha || hashString(latest.installPath),
        version: latest.version,
      };
    }
  } catch {
    // Plugin info parsing error
  }

  return undefined;
}

export function checkEnvironments(): { codeExists: boolean; desktopExists: boolean } {
  return {
    codeExists: existsSync(PATHS.claudeCode.root) && existsSync(PATHS.claudeCode.settings),
    desktopExists: existsSync(PATHS.claudeDesktop.root),
  };
}
