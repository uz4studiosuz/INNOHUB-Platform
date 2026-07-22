export interface BridgeResult {
  id: string;
  timestamp: number;
  designName: string;
  material: string;
  massKg: number;
  failureLoadN: number;
  efficiency: number;
}

const STORAGE_KEY = "innohub_bridge_leaderboard";

export function getBridgeResults(): BridgeResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BridgeResult[]) : [];
  } catch {
    return [];
  }
}

export function addBridgeResult(entry: Omit<BridgeResult, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const list = getBridgeResults();
  list.push({
    ...entry,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function clearBridgeResults(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
