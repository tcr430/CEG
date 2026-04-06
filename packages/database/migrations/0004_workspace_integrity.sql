-- Tighten same-workspace relational integrity without rewriting the base schema.
-- These additive constraints make workspace-scoped authorization easier to reason about.

CREATE UNIQUE INDEX IF NOT EXISTS sender_profiles_workspace_id_id_unique_idx
  ON sender_profiles (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_workspace_id_id_unique_idx
  ON campaigns (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS prospects_workspace_id_id_unique_idx
  ON prospects (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_threads_workspace_id_id_unique_idx
  ON conversation_threads (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS messages_workspace_id_id_unique_idx
  ON messages (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS sequences_workspace_id_id_unique_idx
  ON sequences (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS reply_analyses_workspace_id_id_unique_idx
  ON reply_analyses (workspace_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS draft_replies_workspace_id_id_unique_idx
  ON draft_replies (workspace_id, id);

ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_workspace_sender_profile_fk,
  ADD CONSTRAINT campaigns_workspace_sender_profile_fk
    FOREIGN KEY (workspace_id, sender_profile_id)
    REFERENCES sender_profiles (workspace_id, id)
    ON DELETE SET NULL;

ALTER TABLE prospects
  DROP CONSTRAINT IF EXISTS prospects_workspace_campaign_fk,
  ADD CONSTRAINT prospects_workspace_campaign_fk
    FOREIGN KEY (workspace_id, campaign_id)
    REFERENCES campaigns (workspace_id, id)
    ON DELETE SET NULL;

ALTER TABLE conversation_threads
  DROP CONSTRAINT IF EXISTS conversation_threads_workspace_campaign_fk,
  ADD CONSTRAINT conversation_threads_workspace_campaign_fk
    FOREIGN KEY (workspace_id, campaign_id)
    REFERENCES campaigns (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS conversation_threads_workspace_prospect_fk,
  ADD CONSTRAINT conversation_threads_workspace_prospect_fk
    FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES prospects (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS conversation_threads_workspace_sender_profile_fk,
  ADD CONSTRAINT conversation_threads_workspace_sender_profile_fk
    FOREIGN KEY (workspace_id, sender_profile_id)
    REFERENCES sender_profiles (workspace_id, id)
    ON DELETE SET NULL;

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_workspace_thread_fk,
  ADD CONSTRAINT messages_workspace_thread_fk
    FOREIGN KEY (workspace_id, thread_id)
    REFERENCES conversation_threads (workspace_id, id)
    ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS messages_workspace_campaign_fk,
  ADD CONSTRAINT messages_workspace_campaign_fk
    FOREIGN KEY (workspace_id, campaign_id)
    REFERENCES campaigns (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS messages_workspace_prospect_fk,
  ADD CONSTRAINT messages_workspace_prospect_fk
    FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES prospects (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS messages_workspace_sequence_fk,
  ADD CONSTRAINT messages_workspace_sequence_fk
    FOREIGN KEY (workspace_id, sequence_id)
    REFERENCES sequences (workspace_id, id)
    ON DELETE SET NULL;

ALTER TABLE reply_analyses
  DROP CONSTRAINT IF EXISTS reply_analyses_workspace_thread_fk,
  ADD CONSTRAINT reply_analyses_workspace_thread_fk
    FOREIGN KEY (workspace_id, thread_id)
    REFERENCES conversation_threads (workspace_id, id)
    ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS reply_analyses_workspace_message_fk,
  ADD CONSTRAINT reply_analyses_workspace_message_fk
    FOREIGN KEY (workspace_id, message_id)
    REFERENCES messages (workspace_id, id)
    ON DELETE CASCADE;

ALTER TABLE draft_replies
  DROP CONSTRAINT IF EXISTS draft_replies_workspace_thread_fk,
  ADD CONSTRAINT draft_replies_workspace_thread_fk
    FOREIGN KEY (workspace_id, thread_id)
    REFERENCES conversation_threads (workspace_id, id)
    ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS draft_replies_workspace_message_fk,
  ADD CONSTRAINT draft_replies_workspace_message_fk
    FOREIGN KEY (workspace_id, message_id)
    REFERENCES messages (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS draft_replies_workspace_reply_analysis_fk,
  ADD CONSTRAINT draft_replies_workspace_reply_analysis_fk
    FOREIGN KEY (workspace_id, reply_analysis_id)
    REFERENCES reply_analyses (workspace_id, id)
    ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS draft_replies_workspace_sender_profile_fk,
  ADD CONSTRAINT draft_replies_workspace_sender_profile_fk
    FOREIGN KEY (workspace_id, sender_profile_id)
    REFERENCES sender_profiles (workspace_id, id)
    ON DELETE SET NULL;
