import "server-only";

import {
  createCampaignRepository,
  createConversationThreadRepository,
  createInboxAccountRepository,
  createInboxSyncRunRepository,
  createImportedMessageRefRepository,
  createImportedThreadRefRepository,
  createInMemoryCampaignRepository,
  createInMemoryConversationThreadRepository,
  createInMemoryInboxAccountRepository,
  createInMemoryInboxSyncRunRepository,
  createInMemoryImportedMessageRefRepository,
  createInMemoryImportedThreadRefRepository,
  createInMemoryMessageRepository,
  createInMemoryProspectRepository,
  createInMemorySenderProfileRepository,
  createInMemoryUserRepository,
  createInMemoryWorkspaceMemberRepository,
  createInMemoryWorkspaceRepository,
  createMessageRepository,
  createPostgresDatabaseModule,
  createProspectRepository,
  createSenderProfileRepository,
  createUserRepository,
  createWorkspaceMemberRepository,
  createWorkspaceRepository,
  type CampaignRepository,
  type ConversationThreadRepository,
  type DatabaseModule,
  type ImportedMessageRefRepository,
  type ImportedThreadRefRepository,
  type InboxAccountRepository,
  type InboxSyncRunRepository,
  type MessageRepository,
  type ProspectRepository,
  type SenderProfileRepository,
  type UserRepository,
  type WorkspaceMemberRepository,
  type WorkspaceRepository,
} from "@ceg/database";
import { getOptionalEnv } from "@ceg/security";

declare global {
  var __cegDatabaseModule: DatabaseModule | undefined;
  var __cegWorkspaceRepository: WorkspaceRepository | undefined;
  var __cegSenderProfileRepository: SenderProfileRepository | undefined;
  var __cegCampaignRepository: CampaignRepository | undefined;
  var __cegProspectRepository: ProspectRepository | undefined;
  var __cegConversationThreadRepository: ConversationThreadRepository | undefined;
  var __cegMessageRepository: MessageRepository | undefined;
  var __cegInboxAccountRepository: InboxAccountRepository | undefined;
  var __cegInboxSyncRunRepository: InboxSyncRunRepository | undefined;
  var __cegImportedThreadRefRepository: ImportedThreadRefRepository | undefined;
  var __cegImportedMessageRefRepository: ImportedMessageRefRepository | undefined;
  var __cegUserRepository: UserRepository | undefined;
  var __cegWorkspaceMemberRepository: WorkspaceMemberRepository | undefined;
}

function getDatabaseConnectionString(): string | undefined {
  return getOptionalEnv("DATABASE_URL");
}

export function isDatabaseConfigured(): boolean {
  return getDatabaseConnectionString() !== undefined;
}

function getDatabaseModule(): DatabaseModule | null {
  const connectionString = getDatabaseConnectionString();

  if (connectionString === undefined) {
    return null;
  }

  if (globalThis.__cegDatabaseModule === undefined) {
    globalThis.__cegDatabaseModule = createPostgresDatabaseModule({
      connectionString,
    });
  }

  return globalThis.__cegDatabaseModule;
}

function getDatabaseClient() {
  const databaseModule = getDatabaseModule();

  if (databaseModule === null && process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return databaseModule?.getClient() ?? null;
}

export function getWorkspaceRepository(): WorkspaceRepository {
  if (globalThis.__cegWorkspaceRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegWorkspaceRepository =
      client === null
        ? createInMemoryWorkspaceRepository()
        : createWorkspaceRepository(client);
  }

  return globalThis.__cegWorkspaceRepository;
}

export function getSenderProfileRepository(): SenderProfileRepository {
  if (globalThis.__cegSenderProfileRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegSenderProfileRepository =
      client === null
        ? createInMemorySenderProfileRepository()
        : createSenderProfileRepository(client);
  }

  return globalThis.__cegSenderProfileRepository;
}

export function getCampaignRepository(): CampaignRepository {
  if (globalThis.__cegCampaignRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegCampaignRepository =
      client === null
        ? createInMemoryCampaignRepository()
        : createCampaignRepository(client);
  }

  return globalThis.__cegCampaignRepository;
}

export function getProspectRepository(): ProspectRepository {
  if (globalThis.__cegProspectRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegProspectRepository =
      client === null
        ? createInMemoryProspectRepository()
        : createProspectRepository(client);
  }

  return globalThis.__cegProspectRepository;
}

export function getConversationThreadRepository(): ConversationThreadRepository {
  if (globalThis.__cegConversationThreadRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegConversationThreadRepository =
      client === null
        ? createInMemoryConversationThreadRepository()
        : createConversationThreadRepository(client);
  }

  return globalThis.__cegConversationThreadRepository;
}

export function getMessageRepository(): MessageRepository {
  if (globalThis.__cegMessageRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegMessageRepository =
      client === null ? createInMemoryMessageRepository() : createMessageRepository(client);
  }

  return globalThis.__cegMessageRepository;
}

export function getInboxAccountRepository(): InboxAccountRepository {
  if (globalThis.__cegInboxAccountRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegInboxAccountRepository =
      client === null
        ? createInMemoryInboxAccountRepository()
        : createInboxAccountRepository(client);
  }

  return globalThis.__cegInboxAccountRepository;
}

export function getInboxSyncRunRepository(): InboxSyncRunRepository {
  if (globalThis.__cegInboxSyncRunRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegInboxSyncRunRepository =
      client === null
        ? createInMemoryInboxSyncRunRepository()
        : createInboxSyncRunRepository(client);
  }

  return globalThis.__cegInboxSyncRunRepository;
}

export function getImportedThreadRefRepository(): ImportedThreadRefRepository {
  if (globalThis.__cegImportedThreadRefRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegImportedThreadRefRepository =
      client === null
        ? createInMemoryImportedThreadRefRepository()
        : createImportedThreadRefRepository(client);
  }

  return globalThis.__cegImportedThreadRefRepository;
}

export function getImportedMessageRefRepository(): ImportedMessageRefRepository {
  if (globalThis.__cegImportedMessageRefRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegImportedMessageRefRepository =
      client === null
        ? createInMemoryImportedMessageRefRepository()
        : createImportedMessageRefRepository(client);
  }

  return globalThis.__cegImportedMessageRefRepository;
}

export function getUserRepository(): UserRepository | null {
  if (globalThis.__cegUserRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegUserRepository =
      client === null ? createInMemoryUserRepository() : createUserRepository(client);
  }

  return globalThis.__cegUserRepository;
}

export function getWorkspaceMemberRepository(): WorkspaceMemberRepository | null {
  if (globalThis.__cegWorkspaceMemberRepository === undefined) {
    const client = getDatabaseClient();
    globalThis.__cegWorkspaceMemberRepository =
      client === null
        ? createInMemoryWorkspaceMemberRepository()
        : createWorkspaceMemberRepository(client);
  }

  return globalThis.__cegWorkspaceMemberRepository;
}



