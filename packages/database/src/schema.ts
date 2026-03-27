export const databaseTableNames = [
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

export type DatabaseTableName = (typeof databaseTableNames)[number];

export const initialDatabaseMigration = {
  name: "0001_initial_schema.sql",
  path: "packages/database/migrations/0001_initial_schema.sql",
  tables: databaseTableNames,
} as const;
