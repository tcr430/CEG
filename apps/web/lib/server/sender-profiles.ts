import {
  createInMemorySenderProfileRepository,
  type SenderProfileRepository,
} from "@ceg/database";
import type {
  CreateSenderProfileInput,
  SenderProfile,
  UpdateSenderProfileInput,
} from "@ceg/validation";

declare global {
  var __cegSenderProfileRepository: SenderProfileRepository | undefined;
}

function getSenderProfileRepository(): SenderProfileRepository {
  if (globalThis.__cegSenderProfileRepository === undefined) {
    globalThis.__cegSenderProfileRepository = createInMemorySenderProfileRepository();
  }

  return globalThis.__cegSenderProfileRepository;
}

export async function listSenderProfilesForWorkspace(
  workspaceId: string,
): Promise<SenderProfile[]> {
  return getSenderProfileRepository().listSenderProfilesByWorkspace(workspaceId);
}

export async function getSenderProfileForWorkspace(
  workspaceId: string,
  senderProfileId: string,
): Promise<SenderProfile | null> {
  const profile = await getSenderProfileRepository().getSenderProfileById(
    senderProfileId,
  );

  if (profile === null || profile.workspaceId !== workspaceId) {
    return null;
  }

  return profile;
}

export async function createSenderProfileForWorkspace(
  input: CreateSenderProfileInput,
): Promise<SenderProfile> {
  return getSenderProfileRepository().createSenderProfile(input);
}

export async function updateSenderProfileForWorkspace(
  input: UpdateSenderProfileInput,
): Promise<SenderProfile> {
  return getSenderProfileRepository().updateSenderProfile(input);
}
