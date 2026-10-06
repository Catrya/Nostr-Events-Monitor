export function normalizeRelayUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('://')) return trimmed;
  return `wss://${trimmed}`;
}

export function isValidWebSocketUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  try {
    const normalizedUrl = normalizeRelayUrl(url);
    const urlObj = new URL(normalizedUrl);
    return (urlObj.protocol === 'wss:' || urlObj.protocol === 'ws:') && urlObj.hostname !== '';
  } catch {
    return false;
  }
}
