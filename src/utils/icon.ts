// Generate a simple placeholder icon as base64 PNG
// Creates a colored square with initials

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1",
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  const words = name.replace(/[-_]/g, " ").split(" ");
  if (words.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Simple SVG-based icon generation (can be converted to PNG if needed)
export function generatePlaceholderIcon(name: string): string {
  const color = getColorForName(name);
  const initials = getInitials(name);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="${color}"/>
  <text x="64" y="64" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;

  return svg;
}

export function generatePlaceholderIconPng(name: string): Buffer {
  // For now, return SVG as buffer - in production you'd convert to PNG
  // using sharp or canvas, but this works for DXT extensions
  const svg = generatePlaceholderIcon(name);
  return Buffer.from(svg, "utf-8");
}
