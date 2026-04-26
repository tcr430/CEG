"use server";

import { z } from "zod";

import { setPersistedWorkspaceId } from "../../lib/server/workspace-cookie";

const PersistWorkspaceInput = z.object({
  workspaceId: z.string().min(1).nullable(),
});

/**
 * Server action invoked by the workspace switcher when the user picks a new
 * workspace. Stores the choice in a cookie so subsequent server renders can
 * fall back to it when the URL query param is missing.
 */
export async function persistWorkspaceSelection(
  workspaceId: string | null,
): Promise<void> {
  const parsed = PersistWorkspaceInput.parse({ workspaceId });
  await setPersistedWorkspaceId(parsed.workspaceId);
}
