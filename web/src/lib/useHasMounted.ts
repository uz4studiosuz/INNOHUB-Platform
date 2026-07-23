import { useSyncExternalStore } from "react";

function emptySubscribe() {
  return () => {};
}

/** True only once the component has actually mounted on the client.
 * Lets code defer reading browser-only APIs (localStorage, window, ...)
 * until after hydration, so the server and the client's first render stay
 * identical (avoiding a hydration mismatch) without needing an effect.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
