export const initialDatabaseTableNames = [
  "users",
  "workspaces",
  "workspace_members",
  "sender_profiles",
  "campaigns",
  "prospects",
  "research_snapshots",
  "sequences",
  "conversation_threads",
  "messages",
  "reply_analyses",
  "draft_replies",
  "brand_voice_profiles",
  "prompt_templates",
  "usage_events",
  "audit_events",
  "subscriptions",
] as const;

export const inboxIntegrationTableNames = [
  "inbox_accounts",
  "inbox_sync_runs",
  "imported_thread_refs",
  "imported_message_refs",
] as const;

export const databaseTableNames = [
  ...initialDatabaseTableNames,
  ...inboxIntegrationTableNames,
] as const;

export type DatabaseTableName = (typeof databaseTableNames)[number];

export const initialDatabaseMigration = {
  name: "0001_initial_schema.sql",
  path: "packages/database/migrations/0001_initial_schema.sql",
  tables: initialDatabaseTableNames,
} as const;

export const inboxIntegrationMigration = {
  name: "0005_inbox_integration_foundation.sql",
  path: "packages/database/migrations/0005_inbox_integration_foundation.sql",
  tables: inboxIntegrationTableNames,
} as const;

export const inboxReplyIngestionMigration = {
  name: "0006_inbox_reply_ingestion.sql",
  path: "packages/database/migrations/0006_inbox_reply_ingestion.sql",
  tables: ["imported_message_refs"],
} as const;
