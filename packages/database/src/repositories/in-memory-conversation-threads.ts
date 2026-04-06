import { randomUUID } from "node:crypto";

import type { ConversationThread } from "@ceg/validation";

import type {
  ConversationThreadRepository,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
} from "./conversation-threads.js";
import {
  validateCampaignId,
  validateConversationThreadId,
  validateProspectId,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryConversationThreadRepository(
  initialThreads: ConversationThread[] = [],
): ConversationThreadRepository {
  const records = new Map(
    initialThreads.map((thread) => [thread.id, thread] as const),
  );

  function sortKey(thread: ConversationThread) {
    return thread.updatedAt.getTime();
  }

  return {
    async findOrCreateThreadForProspect(input: CreateConversationThreadInput) {
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const campaignId =
        input.campaignId === undefined || input.campaignId === null
          ? null
          : validateCampaignId(input.campaignId);
      const prospectId =
        input.prospectId === undefined || input.prospectId === null
          ? null
          : validateProspectId(input.prospectId);

      const existing = [...records.values()]
        .filter(
          (thread) =>
            thread.workspaceId === workspaceId &&
            thread.campaignId === campaignId &&
            thread.prospectId === prospectId,
        )
        .sort((left, right) => sortKey(right) - sortKey(left))[0];

      if (existing) {
        return existing;
      }

      const now = new Date();
      const record: ConversationThread = {
        id: randomUUID(),
        workspaceId,
        campaignId,
        prospectId,
        status: input.status ?? "open",
        externalThreadRef: input.externalThreadRef ?? null,
        latestMessageAt: input.latestMessageAt ?? null,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async findOrCreateThreadByExternalRef(input) {
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const externalThreadRef = input.externalThreadRef.trim();
      const existing = [...records.values()]
        .filter(
          (thread) =>
            thread.workspaceId === workspaceId &&
            thread.externalThreadRef === externalThreadRef,
        )
        .sort((left, right) => sortKey(right) - sortKey(left))[0];

      if (existing) {
        return existing;
      }

      const now = new Date();
      const record: ConversationThread = {
        id: randomUUID(),
        workspaceId,
        campaignId: input.campaignId ?? null,
        prospectId: input.prospectId ?? null,
        status: input.status ?? "open",
        externalThreadRef,
        latestMessageAt: input.latestMessageAt ?? null,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      records.set(record.id, record);
      return record;
    },
    async getThreadById(threadId) {
      const validated = validateConversationThreadId(threadId);
      return records.get(validated) ?? null;
    },
    async getThreadByExternalRef(workspaceId, externalThreadRef) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return (
        [...records.values()]
          .filter(
            (thread) =>
              thread.workspaceId === validatedWorkspaceId &&
              thread.externalThreadRef === externalThreadRef,
          )
          .sort((left, right) => sortKey(right) - sortKey(left))[0] ?? null
      );
    },
    async getThreadByProspect(workspaceId, campaignId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const validatedProspectId = validateProspectId(prospectId);
      return (
        [...records.values()]
          .filter(
            (thread) =>
              thread.workspaceId === validatedWorkspaceId &&
              thread.campaignId === validatedCampaignId &&
              thread.prospectId === validatedProspectId,
          )
          .sort((left, right) => sortKey(right) - sortKey(left))[0] ?? null
      );
    },
    async updateThread(input: UpdateConversationThreadInput) {
      const threadId = validateConversationThreadId(input.threadId);
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const existing = records.get(threadId);

      if (!existing || existing.workspaceId !== workspaceId) {
        throw new Error("Conversation thread not found for workspace.");
      }

      const updated: ConversationThread = {
        ...existing,
        status: input.status ?? existing.status,
        latestMessageAt:
          input.latestMessageAt === undefined
            ? existing.latestMessageAt ?? null
            : input.latestMessageAt,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: new Date(),
      };
      records.set(updated.id, updated);
      return updated;
    },
  };
}
