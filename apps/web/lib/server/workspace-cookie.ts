import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAME = "outflow.workspace";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Read the user's last-selected workspace id from the persisted cookie.
 * Used as a fallback when the URL `?workspace=` query param is absent.
 */
export async function getPersistedWorkspaceId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value ?? null;
  return value && value.length > 0 ? value : null;
}

/**
 * Persist the user's active workspace id to a long-lived cookie so the next
 * server render can default to it before the URL query param is parsed.
 * Pass `null` to clear the cookie.
 */
export async function setPersistedWorkspaceId(
  workspaceId: string | null,
): Promise<void> {
  const store = await cookies();
  if (workspaceId === null) {
    store.delete(COOKIE_NAME);
    return;
  }
  store.set(COOKIE_NAME, workspaceId, {
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}
