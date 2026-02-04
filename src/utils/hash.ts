import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

export function hashDirectory(dirPath: string): string {
  const hash = createHash("sha256");

  function processDir(dir: string) {
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      if (entry === ".git" || entry === "node_modules") continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        processDir(fullPath);
      } else {
        hash.update(readFileSync(fullPath));
      }
    }
  }

  processDir(dirPath);
  return hash.digest("hex").slice(0, 12);
}

export function hashString(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}
