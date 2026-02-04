import * as p from "@clack/prompts";
import pc from "picocolors";
import { createTwoFilesPatch } from "diff";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { ComparisonResult } from "../sync/differ";

export async function showDiffs(comparisons: ComparisonResult[]): Promise<void> {
  const modifiedItems = comparisons.filter((c) => c.status === "modified");

  if (modifiedItems.length === 0) {
    return;
  }

  p.log.info(pc.bold("\nChanges detected:"));

  for (const comparison of modifiedItems) {
    const item = comparison.item;

    console.log();
    console.log(pc.bold(`┌ ${item.displayName}`));
    console.log(pc.dim(`│ ${item.type} • ${item.path}`));

    // Try to show diff for SKILL.md if it's a skill
    if (item.type === "skill") {
      const skillMdPath = join(item.path, "SKILL.md");
      if (existsSync(skillMdPath)) {
        try {
          const content = readFileSync(skillMdPath, "utf-8");
          // Show first few lines as preview
          const preview = content.split("\n").slice(0, 10).join("\n");
          console.log(pc.dim("│"));
          for (const line of preview.split("\n")) {
            console.log(pc.dim(`│ ${line}`));
          }
          if (content.split("\n").length > 10) {
            console.log(pc.dim("│ ..."));
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    console.log(pc.dim("└"));
  }

  // Show summary
  const newItems = comparisons.filter((c) => c.status === "new");
  const removedItems = comparisons.filter((c) => c.status === "removed");

  console.log();

  if (newItems.length > 0) {
    p.log.info(
      pc.green(`+ ${newItems.length} new item${newItems.length === 1 ? "" : "s"}`)
    );
  }

  if (modifiedItems.length > 0) {
    p.log.info(
      pc.yellow(
        `~ ${modifiedItems.length} modified item${modifiedItems.length === 1 ? "" : "s"}`
      )
    );
  }

  if (removedItems.length > 0) {
    p.log.info(
      pc.red(
        `- ${removedItems.length} removed item${removedItems.length === 1 ? "" : "s"}`
      )
    );
  }

  console.log();
}

export function formatDiff(diff: string): string {
  const lines = diff.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      formatted.push(pc.green(line));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      formatted.push(pc.red(line));
    } else if (line.startsWith("@@")) {
      formatted.push(pc.cyan(line));
    } else {
      formatted.push(pc.dim(line));
    }
  }

  return formatted.join("\n");
}
