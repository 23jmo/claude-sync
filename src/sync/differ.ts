import { createTwoFilesPatch } from "diff";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { ScannedItem, SyncManifest, SyncItem, DiffResult } from "../types";

export interface ComparisonResult {
  item: ScannedItem;
  status: "new" | "modified" | "unchanged" | "removed";
  previousHash?: string;
  linkedItem?: SyncItem;
}

export function compareWithManifest(
  items: ScannedItem[],
  manifest: SyncManifest,
  direction: "code-to-desktop" | "desktop-to-code"
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  const sourceApp = direction === "code-to-desktop" ? "code" : "desktop";

  // Check each scanned item against manifest
  for (const item of items) {
    const existingItem = manifest.items[item.id];

    if (!existingItem) {
      // Check if there's a linked item with same name in target app
      const linkedItem = Object.values(manifest.items).find(
        (i) => i.name === item.name && i.sourceApp !== sourceApp
      );

      results.push({
        item,
        status: "new",
        linkedItem,
      });
    } else if (existingItem.sourceHash !== item.hash) {
      results.push({
        item,
        status: "modified",
        previousHash: existingItem.sourceHash,
      });
    } else {
      results.push({
        item,
        status: "unchanged",
      });
    }
  }

  // Check for removed items (in manifest but not in scan)
  for (const [id, manifestItem] of Object.entries(manifest.items)) {
    if (manifestItem.sourceApp !== sourceApp) continue;

    const stillExists = items.some((item) => item.id === id);
    if (!stillExists) {
      results.push({
        item: {
          id,
          type: manifestItem.type,
          name: manifestItem.name,
          displayName: manifestItem.displayName,
          path: manifestItem.sourcePath,
          hash: manifestItem.sourceHash,
          app: manifestItem.sourceApp,
        },
        status: "removed",
      });
    }
  }

  return results;
}

export function generateDiff(
  oldPath: string,
  newPath: string,
  fileName: string
): string {
  let oldContent = "";
  let newContent = "";

  if (existsSync(oldPath)) {
    try {
      oldContent = readFileSync(oldPath, "utf-8");
    } catch {
      oldContent = "[Could not read file]";
    }
  }

  if (existsSync(newPath)) {
    try {
      newContent = readFileSync(newPath, "utf-8");
    } catch {
      newContent = "[Could not read file]";
    }
  }

  return createTwoFilesPatch(
    `a/${fileName}`,
    `b/${fileName}`,
    oldContent,
    newContent,
    "",
    ""
  );
}

export function generateSkillDiff(
  skillPath: string,
  previousContent?: string
): string {
  const skillMd = join(skillPath, "SKILL.md");

  if (!existsSync(skillMd)) {
    return "[SKILL.md not found]";
  }

  const currentContent = readFileSync(skillMd, "utf-8");

  if (!previousContent) {
    return `[New skill]\n\n${currentContent.slice(0, 500)}${currentContent.length > 500 ? "..." : ""}`;
  }

  return createTwoFilesPatch(
    "a/SKILL.md",
    "b/SKILL.md",
    previousContent,
    currentContent,
    "",
    ""
  );
}

export function categorizeDiffs(comparisons: ComparisonResult[]): DiffResult {
  return {
    added: comparisons.filter((c) => c.status === "new").map((c) => c.item.id),
    removed: comparisons.filter((c) => c.status === "removed").map((c) => c.item.id),
    modified: comparisons.filter((c) => c.status === "modified").map((c) => c.item.id),
    unchanged: comparisons.filter((c) => c.status === "unchanged").map((c) => c.item.id),
  };
}
