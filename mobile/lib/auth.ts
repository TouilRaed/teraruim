import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

const TOKEN_KEY = "admin_jwt";

// In-memory cache + subscribers so React re-renders on login/logout.
let cached: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export async function loadToken(): Promise<string | null> {
  cached = await SecureStore.getItemAsync(TOKEN_KEY);
  loaded = true;
  emit();
  return cached;
}

export async function getToken(): Promise<string | null> {
  if (!loaded) return loadToken();
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  cached = token;
  loaded = true;
  emit();
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  cached = null;
  loaded = true;
  emit();
}

// React hook: reactive auth state. Returns { token, loaded }.
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function snapshot() {
  return cached;
}
export function useAuthToken(): { token: string | null; loaded: boolean } {
  const token = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { token, loaded };
}
