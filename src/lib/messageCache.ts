const STORAGE_KEY = 'oms_packs_with_messages';

export function getPacksWithMessages(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markPackHasMessages(packId: string): void {
  if (!packId) return;
  const set = getPacksWithMessages();
  if (!set.has(packId)) {
    set.add(packId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  }
}
