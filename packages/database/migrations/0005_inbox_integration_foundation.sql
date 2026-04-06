CREATE TABLE inbox_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'microsoft365')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  provider_account_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'disconnected', 'error')
  ),
  sync_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX inbox_accounts_workspace_provider_email_unique_idx
  ON inbox_accounts (workspace_id, provider, LOWER(email_address));
CREATE UNIQUE INDEX inbox_accounts_provider_ref_unique_idx
  ON inbox_accounts (provider, provider_account_ref);
CREATE INDEX inbox_accounts_workspace_status_idx
  ON inbox_accounts (workspace_id, status, updated_at DESC);
CREATE INDEX inbox_accounts_user_id_idx ON inbox_accounts (user_id);

CREATE TABLE inbox_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  inbox_account_id UUID NOT NULL REFERENCES inbox_accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'microsoft365')),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'partial')
  ),
  sync_mode TEXT NOT NULL DEFAULT 'incremental' CHECK (
    sync_mode IN ('initial', 'incremental', 'manual', 'backfill')
  ),
  cursor_before TEXT,
  cursor_after TEXT,
  imported_thread_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_thread_count >= 0),
  imported_message_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_message_count >= 0),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX inbox_sync_runs_account_started_at_idx
  ON inbox_sync_runs (inbox_account_id, started_at DESC);
CREATE INDEX inbox_sync_runs_workspace_status_idx
  ON inbox_sync_runs (workspace_id, status, started_at DESC);

CREATE TABLE imported_thread_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  inbox_account_id UUID NOT NULL REFERENCES inbox_accounts(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  conversation_thread_id UUID REFERENCES conversation_threads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'microsoft365')),
  provider_thread_id TEXT NOT NULL,
  provider_folder TEXT,
  subject TEXT,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  snippet TEXT,
  last_message_received_at TIMESTAMPTZ,
  sync_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inbox_account_id, provider_thread_id)
);

CREATE INDEX imported_thread_refs_workspace_thread_idx
  ON imported_thread_refs (workspace_id, conversation_thread_id);
CREATE INDEX imported_thread_refs_workspace_prospect_idx
  ON imported_thread_refs (workspace_id, prospect_id);
CREATE INDEX imported_thread_refs_account_updated_at_idx
  ON imported_thread_refs (inbox_account_id, updated_at DESC);

CREATE TABLE imported_message_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  inbox_account_id UUID NOT NULL REFERENCES inbox_accounts(id) ON DELETE CASCADE,
  imported_thread_ref_id UUID NOT NULL REFERENCES imported_thread_refs(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'microsoft365')),
  provider_message_id TEXT NOT NULL,
  provider_thread_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  provider_message_type TEXT NOT NULL CHECK (
    provider_message_type IN ('inbound', 'outbound', 'draft')
  ),
  subject TEXT,
  from_address TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  bcc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inbox_account_id, provider_message_id)
);

CREATE INDEX imported_message_refs_thread_created_at_idx
  ON imported_message_refs (imported_thread_ref_id, created_at DESC);
CREATE INDEX imported_message_refs_message_id_idx
  ON imported_message_refs (message_id);
CREATE INDEX imported_message_refs_workspace_direction_idx
  ON imported_message_refs (workspace_id, direction, updated_at DESC);

CREATE TRIGGER set_inbox_accounts_updated_at
BEFORE UPDATE ON inbox_accounts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_inbox_sync_runs_updated_at
BEFORE UPDATE ON inbox_sync_runs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_imported_thread_refs_updated_at
BEFORE UPDATE ON imported_thread_refs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_imported_message_refs_updated_at
BEFORE UPDATE ON imported_message_refs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
