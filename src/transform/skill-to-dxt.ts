import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync, statSync } from "fs";
import { join, basename } from "path";
import { PATHS, ensureDir } from "../utils/paths";
import { generatePlaceholderIcon } from "../utils/icon";
import type { DxtManifest, ScannedItem } from "../types";

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

export function convertSkillToDxt(item: ScannedItem): ConversionResult {
  // Resolve symlinks
  const stat = statSync(item.path, { throwIfNoEntry: false });
  if (!stat) {
    return { success: false, error: "Skill path does not exist" };
  }

  const realPath = stat.isSymbolicLink() ? realpathSync(item.path) : item.path;
  const skillMdPath = join(realPath, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    return { success: false, error: "SKILL.md not found" };
  }

  const skillContent = readFileSync(skillMdPath, "utf-8");
  const parsed = parseSkillMd(skillContent);

  // Check for incompatible features
  const incompatibility = checkIncompatibility(skillContent, realPath);
  if (incompatibility) {
    return {
      success: false,
      skipped: true,
      skipReason: incompatibility,
    };
  }

  // Generate DXT structure
  const extName = item.name;
  const outputDir = join(PATHS.claudeDesktop.extensions, extName);

  ensureDir(outputDir);
  ensureDir(join(outputDir, "server"));

  // Create manifest
  const manifest: DxtManifest = {
    dxt_version: "0.1",
    name: extName,
    display_name: parsed.title || item.displayName,
    version: "1.0.0",
    description: parsed.description || `Converted from Claude Code skill: ${extName}`,
    long_description: parsed.content,
    author: {
      name: "claude-sync",
      url: "https://github.com/your-repo/claude-sync",
    },
    icon: "icon.svg",
    server: {
      type: "node",
      entry_point: "server/index.js",
      mcp_config: {
        command: "node",
        args: ["${__dirname}/server/index.js"],
      },
    },
    prompts: parsed.prompts,
    keywords: ["converted", "claude-code", "skill"],
    license: "MIT",
    compatibility: {
      claude_desktop: ">=0.10.0",
      platforms: ["darwin", "win32", "linux"],
      runtimes: { node: ">=16.0.0" },
    },
  };

  // Write manifest
  writeFileSync(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Write icon
  const iconSvg = generatePlaceholderIcon(extName);
  writeFileSync(join(outputDir, "icon.svg"), iconSvg);

  // Write minimal MCP server that exposes prompts
  const serverCode = generateMcpServer(extName, parsed.prompts);
  writeFileSync(join(outputDir, "server", "index.js"), serverCode);

  // Copy README if exists
  const readmePath = join(realPath, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf-8");
    writeFileSync(join(outputDir, "README.md"), readme);
  }

  return {
    success: true,
    outputPath: outputDir,
  };
}

interface ParsedSkill {
  title?: string;
  description?: string;
  content: string;
  prompts: Array<{
    name: string;
    description: string;
    text: string;
  }>;
}

function parseSkillMd(content: string): ParsedSkill {
  const lines = content.split("\n");
  let title: string | undefined;
  let description: string | undefined;
  const prompts: ParsedSkill["prompts"] = [];

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract description from first paragraph
  const descMatch = content.match(/^#.+\n+([^#\n].+)/m);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  // The entire content becomes a prompt
  prompts.push({
    name: "skill_prompt",
    description: description || "Main skill prompt",
    text: content,
  });

  return {
    title,
    description,
    content,
    prompts,
  };
}

function checkIncompatibility(content: string, path: string): string | null {
  // Check for subagent references
  if (content.includes("subagent") || content.includes("Task tool")) {
    return "Uses subagents which are not supported in Desktop";
  }

  // Check for hook references
  if (content.includes("hooks:") || content.includes("PreToolUse")) {
    return "Uses hooks which are not supported in Desktop";
  }

  // Check for custom agent references
  const agentDir = join(path, "..", "..", "agents");
  if (content.includes("agents/") && existsSync(agentDir)) {
    return "References custom agents which are not supported in Desktop";
  }

  return null;
}

function generateMcpServer(
  name: string,
  prompts: Array<{ name: string; description: string; text: string }>
): string {
  const promptsJson = JSON.stringify(prompts, null, 2);

  return `#!/usr/bin/env node
// Auto-generated MCP server for skill: ${name}
// This server exposes the skill's prompts via MCP

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const PROMPTS = ${promptsJson};

const server = new Server(
  { name: "${name}", version: "1.0.0" },
  { capabilities: { prompts: {} } }
);

server.setRequestHandler("prompts/list", async () => ({
  prompts: PROMPTS.map(p => ({
    name: p.name,
    description: p.description,
  })),
}));

server.setRequestHandler("prompts/get", async (request) => {
  const prompt = PROMPTS.find(p => p.name === request.params.name);
  if (!prompt) {
    throw new Error(\`Prompt not found: \${request.params.name}\`);
  }
  return {
    messages: [{ role: "user", content: { type: "text", text: prompt.text } }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
`;
}
