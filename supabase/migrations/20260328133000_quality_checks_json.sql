ALTER TABLE sequences
  ADD COLUMN IF NOT EXISTS quality_checks_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE draft_replies
  ADD COLUMN IF NOT EXISTS quality_checks_json JSONB NOT NULL DEFAULT '{}'::jsonb;