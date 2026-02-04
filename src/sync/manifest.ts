import { existsSync, readFileSync, writeFileSync } from "fs";
import { PATHS, ensureDir } from "../utils/paths";
import type { SyncManifest, SyncItem, BackupRecord } from "../types";

const DEFAULT_MANIFEST: SyncManifest = {
  version: 1,
  items: {},
  backups: [],
};

export function loadManifest(): SyncManifest {
  ensureDir(PATHS.syncData.root);

  if (!existsSync(PATHS.syncData.manifest)) {
    return { ...DEFAULT_MANIFEST };
  }

  try {
    const content = readFileSync(PATHS.syncData.manifest, "utf-8");
    return JSON.parse(content) as SyncManifest;
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export function saveManifest(manifest: SyncManifest): void {
  ensureDir(PATHS.syncData.root);
  writeFileSync(PATHS.syncData.manifest, JSON.stringify(manifest, null, 2));
}

export function updateItem(manifest: SyncManifest, item: SyncItem): SyncManifest {
  return {
    ...manifest,
    items: {
      ...manifest.items,
      [item.id]: item,
    },
  };
}

export function removeItem(manifest: SyncManifest, itemId: string): SyncManifest {
  const { [itemId]: _, ...rest } = manifest.items;
  return {
    ...manifest,
    items: rest,
  };
}

export function addBackup(manifest: SyncManifest, backup: BackupRecord): SyncManifest {
  return {
    ...manifest,
    backups: [...manifest.backups, backup],
  };
}

export function getItemBySourcePath(manifest: SyncManifest, sourcePath: string): SyncItem | undefined {
  return Object.values(manifest.items).find((item) => item.sourcePath === sourcePath);
}

export function getItemByName(manifest: SyncManifest, name: string, app: "code" | "desktop"): SyncItem | undefined {
  return Object.values(manifest.items).find(
    (item) => item.name === name && item.sourceApp === app
  );
}

export function findLinkedItem(manifest: SyncManifest, name: string): SyncItem | undefined {
  // Find items with same name across both apps
  const items = Object.values(manifest.items).filter((item) => item.name === name);
  return items.length > 1 ? items[0] : undefined;
}
