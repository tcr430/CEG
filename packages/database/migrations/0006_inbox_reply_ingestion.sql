ALTER TABLE imported_message_refs
  ADD COLUMN message_role TEXT NOT NULL DEFAULT 'unclassified' CHECK (
    message_role IN ('reply', 'outbound', 'draft', 'unclassified')
  ),
  ADD COLUMN reply_to_provider_message_id TEXT,
  ADD COLUMN raw_body_text TEXT,
  ADD COLUMN raw_body_html TEXT,
  ADD COLUMN normalized_body_text TEXT,
  ADD COLUMN normalized_body_html TEXT;

CREATE INDEX imported_message_refs_workspace_role_idx
  ON imported_message_refs (workspace_id, message_role, updated_at DESC);
