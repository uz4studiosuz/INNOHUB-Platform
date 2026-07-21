export interface KeyMetric {
  label: string;
  value: number;
  unit?: string;
}

export interface Iteration {
  id: string;
  timestamp: number;
  params: Record<string, number | string>;
  keyMetric: KeyMetric;
}

const STORAGE_PREFIX = "innohub_iterations_";

function storageKey(moduleKey: string): string {
  return `${STORAGE_PREFIX}${moduleKey}`;
}

export function getIterations(moduleKey: string): Iteration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(moduleKey));
    return raw ? (JSON.parse(raw) as Iteration[]) : [];
  } catch {
    return [];
  }
}

export function logIteration(
  moduleKey: string,
  params: Record<string, number | string>,
  keyMetric: KeyMetric
): void {
  if (typeof window === "undefined") return;
  const list = getIterations(moduleKey);
  list.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    params,
    keyMetric,
  });
  localStorage.setItem(storageKey(moduleKey), JSON.stringify(list));
}

export function clearIterations(moduleKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(moduleKey));
}

export function getBestIteration(
  moduleKey: string,
  direction: "max" | "min" = "max"
): Iteration | null {
  const list = getIterations(moduleKey);
  if (!list.length) return null;
  return list.reduce((best, cur) => {
    if (direction === "max") return cur.keyMetric.value > best.keyMetric.value ? cur : best;
    return cur.keyMetric.value < best.keyMetric.value ? cur : best;
  }, list[0]);
}
