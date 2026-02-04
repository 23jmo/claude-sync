// Registry lookup for finding official DXT extensions

// Known mappings from Claude Code plugins to DXT extensions
const KNOWN_MAPPINGS: Record<string, string> = {
  context7: "context7",
  playwright: "ant.dir.ant.playwright",
  // Add more mappings as they become available
};

export interface RegistryLookupResult {
  found: boolean;
  extensionId?: string;
  recommendInstallFromRegistry: boolean;
}

export function lookupInRegistry(pluginName: string): RegistryLookupResult {
  // Check if we have a known mapping
  const mapping = KNOWN_MAPPINGS[pluginName.toLowerCase()];

  if (mapping) {
    return {
      found: true,
      extensionId: mapping,
      recommendInstallFromRegistry: true,
    };
  }

  // In a full implementation, this would query the Anthropic extension registry
  // For now, we just return not found
  return {
    found: false,
    recommendInstallFromRegistry: false,
  };
}

export function getRegistryInstallInstructions(extensionId: string): string {
  return `To install from the official registry:
1. Open Claude Desktop
2. Go to Settings > Extensions
3. Search for "${extensionId}"
4. Click Install

This is recommended over local conversion for better compatibility and updates.`;
}
