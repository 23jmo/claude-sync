export type AppType = "code" | "desktop";
export type SyncDirection = "code-to-desktop" | "desktop-to-code";
export type ItemType = "skill" | "plugin" | "extension" | "mcp-server";
export type ItemStatus = "synced" | "modified" | "new" | "removed" | "skipped";

export interface SyncItem {
  id: string;
  type: ItemType;
  name: string;
  displayName: string;

  // Source info
  sourceApp: AppType;
  sourcePath: string;
  sourceHash: string;

  // Target info (if synced)
  targetApp?: AppType;
  targetPath?: string;
  targetHash?: string;

  // Registry info (if from official registry)
  registryId?: string;
  registryVersion?: string;

  // Sync state
  status: ItemStatus;
  lastSynced?: string;
  skipReason?: string;

  // Linking (for items that exist in both)
  linkedTo?: string;
}

export interface BackupRecord {
  timestamp: string;
  path: string;
  direction: SyncDirection;
  itemsSynced: string[];
}

export interface SyncManifest {
  version: 1;
  lastSync?: string;
  items: Record<string, SyncItem>;
  backups: BackupRecord[];
}

export interface ScannedItem {
  id: string;
  type: ItemType;
  name: string;
  displayName: string;
  path: string;
  hash: string;
  app: AppType;
  metadata?: Record<string, unknown>;
}

export interface DxtManifest {
  dxt_version?: string;
  manifest_version?: string;
  name: string;
  display_name?: string;
  version: string;
  description: string;
  long_description?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  documentation?: string;
  support?: string;
  icon?: string;
  server?: {
    type: string;
    entry_point: string;
    mcp_config?: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
  tools?: Array<{
    name: string;
    description: string;
  }>;
  prompts?: Array<{
    name: string;
    description: string;
    arguments?: unknown[];
    text?: string;
  }>;
  keywords?: string[];
  license?: string;
  compatibility?: {
    claude_desktop?: string;
    platforms?: string[];
    runtimes?: Record<string, string>;
  };
}

export interface SkillMetadata {
  name: string;
  description?: string;
  content: string;
  hasReadme: boolean;
  readmeContent?: string;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
}
