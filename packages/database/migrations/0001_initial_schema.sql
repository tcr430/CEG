CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  auth_provider TEXT,
  auth_provider_subject TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (LOWER(email));
CREATE UNIQUE INDEX users_auth_provider_subject_unique_idx
  ON users (auth_provider, auth_provider_subject)
  WHERE auth_provider IS NOT NULL AND auth_provider_subject IS NOT NULL;

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX workspaces_slug_unique_idx ON workspaces (LOWER(slug));
CREATE INDEX workspaces_owner_user_id_idx ON workspaces (owner_user_id);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX workspace_members_user_id_idx ON workspace_members (user_id);
CREATE INDEX workspace_members_workspace_role_idx ON workspace_members (workspace_id, role);

CREATE TABLE brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  style_guide JSONB NOT NULL DEFAULT '{}'::jsonb,
  prohibited_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE INDEX brand_voice_profiles_workspace_status_idx
  ON brand_voice_profiles (workspace_id, status);

CREATE TABLE sender_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('sdr', 'saas_founder', 'agency', 'basic')),
  company_name TEXT,
  company_website TEXT,
  product_description TEXT,
  target_customer TEXT,
  value_proposition TEXT,
  differentiation TEXT,
  proof_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  tone_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sender_profiles_workspace_status_idx
  ON sender_profiles (workspace_id, status);
CREATE UNIQUE INDEX sender_profiles_workspace_name_unique_idx
  ON sender_profiles (workspace_id, LOWER(name));
CREATE UNIQUE INDEX sender_profiles_default_unique_idx
  ON sender_profiles (workspace_id)
  WHERE is_default = TRUE;

CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_kind TEXT NOT NULL CHECK (
    template_kind IN (
      'research_snapshot',
      'sequence_generation',
      'reply_analysis',
      'draft_reply',
      'system'
    )
  ),
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'retired')),
  template_body TEXT NOT NULL,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX prompt_templates_global_unique_idx
  ON prompt_templates (LOWER(name), version)
  WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX prompt_templates_workspace_unique_idx
  ON prompt_templates (workspace_id, LOWER(name), version)
  WHERE workspace_id IS NOT NULL;
CREATE INDEX prompt_templates_workspace_status_idx
  ON prompt_templates (workspace_id, template_kind, status);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sender_profile_id UUID REFERENCES sender_profiles(id) ON DELETE SET NULL,
  brand_voice_profile_id UUID REFERENCES brand_voice_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  offer_summary TEXT,
  target_persona TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'paused', 'completed', 'archived')
  ),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX campaigns_workspace_name_unique_idx
  ON campaigns (workspace_id, LOWER(name));
CREATE INDEX campaigns_workspace_status_idx
  ON campaigns (workspace_id, status);
CREATE INDEX campaigns_sender_profile_id_idx ON campaigns (sender_profile_id);

CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  title TEXT,
  company_name TEXT,
  company_domain TEXT,
  company_website TEXT,
  linkedin_url TEXT,
  location TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'researched', 'sequenced', 'contacted', 'replied', 'closed', 'archived')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX prospects_workspace_status_idx ON prospects (workspace_id, status);
CREATE INDEX prospects_campaign_id_idx ON prospects (campaign_id);
CREATE INDEX prospects_workspace_company_domain_idx
  ON prospects (workspace_id, company_domain);
CREATE UNIQUE INDEX prospects_workspace_email_unique_idx
  ON prospects (workspace_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE TABLE research_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'website' CHECK (source_type IN ('website', 'linkedin', 'manual')),
  fetch_status TEXT NOT NULL DEFAULT 'captured' CHECK (fetch_status IN ('captured', 'failed', 'stale')),
  snapshot_hash TEXT,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_capture JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX research_snapshots_prospect_idx ON research_snapshots (prospect_id, captured_at DESC);
CREATE INDEX research_snapshots_workspace_source_idx ON research_snapshots (workspace_id, source_type);
CREATE UNIQUE INDEX research_snapshots_prospect_hash_unique_idx
  ON research_snapshots (prospect_id, source_url, snapshot_hash)
  WHERE snapshot_hash IS NOT NULL;

CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  sender_profile_id UUID REFERENCES sender_profiles(id) ON DELETE SET NULL,
  brand_voice_profile_id UUID REFERENCES brand_voice_profiles(id) ON DELETE SET NULL,
  prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  generation_mode TEXT NOT NULL CHECK (generation_mode IN ('basic', 'sender_aware')),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'archived')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sequences_workspace_status_idx ON sequences (workspace_id, status);
CREATE INDEX sequences_campaign_prospect_idx ON sequences (campaign_id, prospect_id);
CREATE INDEX sequences_prompt_template_id_idx ON sequences (prompt_template_id);

CREATE TABLE conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  sender_profile_id UUID REFERENCES sender_profiles(id) ON DELETE SET NULL,
  external_thread_ref TEXT,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'closed', 'archived')),
  latest_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conversation_threads_workspace_status_idx
  ON conversation_threads (workspace_id, status, latest_message_at DESC);
CREATE INDEX conversation_threads_prospect_idx ON conversation_threads (prospect_id);
CREATE UNIQUE INDEX conversation_threads_external_ref_unique_idx
  ON conversation_threads (workspace_id, external_thread_ref)
  WHERE external_thread_ref IS NOT NULL;

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_kind TEXT NOT NULL DEFAULT 'email' CHECK (message_kind IN ('email', 'reply')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'queued', 'sent', 'delivered', 'received', 'failed', 'archived')
  ),
  provider_message_id TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_thread_created_at_idx ON messages (thread_id, created_at DESC);
CREATE INDEX messages_workspace_direction_idx ON messages (workspace_id, direction, created_at DESC);
CREATE UNIQUE INDEX messages_provider_message_id_unique_idx
  ON messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE reply_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  classification TEXT NOT NULL CHECK (
    classification IN ('positive', 'neutral', 'negative', 'objection', 'unsubscribe', 'unknown')
  ),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  intent TEXT,
  confidence NUMERIC(5, 4),
  structured_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id)
);

CREATE INDEX reply_analyses_thread_idx ON reply_analyses (thread_id, analyzed_at DESC);
CREATE INDEX reply_analyses_classification_idx ON reply_analyses (classification);

CREATE TABLE draft_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reply_analysis_id UUID REFERENCES reply_analyses(id) ON DELETE SET NULL,
  sender_profile_id UUID REFERENCES sender_profiles(id) ON DELETE SET NULL,
  prompt_template_id UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'sent', 'discarded')),
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  structured_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX draft_replies_thread_status_idx ON draft_replies (thread_id, status);
CREATE INDEX draft_replies_reply_analysis_id_idx ON draft_replies (reply_analysis_id);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  quantity INTEGER NOT NULL DEFAULT 1,
  billable BOOLEAN NOT NULL DEFAULT FALSE,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(12, 6),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_events_workspace_occurred_at_idx
  ON usage_events (workspace_id, occurred_at DESC);
CREATE INDEX usage_events_event_name_idx ON usage_events (event_name);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  request_id TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_workspace_created_at_idx
  ON audit_events (workspace_id, created_at DESC);
CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id);
CREATE INDEX audit_events_request_id_idx ON audit_events (request_id);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
  ),
  seats INTEGER NOT NULL DEFAULT 1,
  billing_email TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX subscriptions_provider_subscription_unique_idx
  ON subscriptions (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX subscriptions_workspace_status_idx ON subscriptions (workspace_id, status);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_workspace_members_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_brand_voice_profiles_updated_at
BEFORE UPDATE ON brand_voice_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sender_profiles_updated_at
BEFORE UPDATE ON sender_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_prompt_templates_updated_at
BEFORE UPDATE ON prompt_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_prospects_updated_at
BEFORE UPDATE ON prospects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_research_snapshots_updated_at
BEFORE UPDATE ON research_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sequences_updated_at
BEFORE UPDATE ON sequences
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_conversation_threads_updated_at
BEFORE UPDATE ON conversation_threads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_messages_updated_at
BEFORE UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_reply_analyses_updated_at
BEFORE UPDATE ON reply_analyses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_draft_replies_updated_at
BEFORE UPDATE ON draft_replies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
