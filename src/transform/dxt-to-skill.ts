import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { PATHS, ensureDir } from "../utils/paths";
import type { DxtManifest, ScannedItem, McpServerConfig } from "../types";

export interface ConversionResult {
  success: boolean;
  skillPath?: string;
  mcpConfig?: { name: string; config: McpServerConfig };
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export function convertDxtToSkill(item: ScannedItem): ConversionResult {
  const metadata = item.metadata as { manifest?: DxtManifest } | undefined;
  const manifest = metadata?.manifest;

  if (!manifest) {
    return { success: false, error: "No manifest found for extension" };
  }

  const results: ConversionResult = { success: true };

  // Create MCP server config if the extension has a server
  if (manifest.server?.mcp_config) {
    const serverPath = join(item.path, manifest.server.entry_point);

    results.mcpConfig = {
      name: manifest.name,
      config: {
        command: manifest.server.mcp_config.command,
        args: manifest.server.mcp_config.args?.map((arg) =>
          arg.replace("${__dirname}", item.path)
        ),
        env: manifest.server.mcp_config.env,
      },
    };
  }

  // Create skill wrapper if extension has prompts
  if (manifest.prompts && manifest.prompts.length > 0) {
    const skillDir = join(PATHS.claudeCode.skills, manifest.name);
    ensureDir(skillDir);

    const skillContent = generateSkillMd(manifest);
    writeFileSync(join(skillDir, "SKILL.md"), skillContent);

    // Copy README if available
    const readmePath = join(item.path, "README.md");
    if (existsSync(readmePath)) {
      const readme = readFileSync(readmePath, "utf-8");
      writeFileSync(join(skillDir, "README.md"), readme);
    }

    results.skillPath = skillDir;
  }

  return results;
}

function generateSkillMd(manifest: DxtManifest): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${manifest.display_name || manifest.name}`);
  lines.push("");

  // Description
  if (manifest.description) {
    lines.push(manifest.description);
    lines.push("");
  }

  // Long description
  if (manifest.long_description) {
    lines.push(manifest.long_description);
    lines.push("");
  }

  // Prompts section
  if (manifest.prompts && manifest.prompts.length > 0) {
    lines.push("## Prompts");
    lines.push("");

    for (const prompt of manifest.prompts) {
      lines.push(`### ${prompt.name}`);
      lines.push("");
      if (prompt.description) {
        lines.push(prompt.description);
        lines.push("");
      }
      if (prompt.text) {
        lines.push("```");
        lines.push(prompt.text);
        lines.push("```");
        lines.push("");
      }
    }
  }

  // Tools section
  if (manifest.tools && manifest.tools.length > 0) {
    lines.push("## Available Tools");
    lines.push("");
    lines.push("This extension provides the following MCP tools:");
    lines.push("");

    for (const tool of manifest.tools) {
      lines.push(`- **${tool.name}**: ${tool.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function addMcpServerToSettings(name: string, config: McpServerConfig): void {
  const settingsPath = PATHS.claudeCode.settings;

  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Start with empty settings
    }
  }

  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }

  (settings.mcpServers as Record<string, McpServerConfig>)[name] = config;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}
