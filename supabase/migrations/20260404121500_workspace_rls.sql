-- Workspace-scoped Row Level Security foundation for Supabase/Postgres.
--
-- Intent:
-- 1. Keep normal product tables readable and writable only within the caller's workspace scope.
-- 2. Reserve operational and billing tables for owner/admin reads and server-only writes.
-- 3. Keep service-role usage server-only; no client-facing policy should depend on service credentials.
--
-- Notes:
-- - Current app enforcement still happens in server services first.
-- - These policies are the database backstop for future Supabase-backed repository implementations.
-- - Cross-table workspace consistency for optional foreign keys is still enforced in application services today.

CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.app_has_workspace_access(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS workspace_member
    WHERE workspace_member.workspace_id = target_workspace_id
      AND workspace_member.user_id = auth.uid()
      AND workspace_member.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.app_has_workspace_role(target_workspace_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members AS workspace_member
    WHERE workspace_member.workspace_id = target_workspace_id
      AND workspace_member.user_id = auth.uid()
      AND workspace_member.status = 'active'
      AND workspace_member.role = ANY(allowed_roles)
  );
$$;

COMMENT ON FUNCTION public.app_current_user_id() IS
  'Returns the authenticated Supabase user id for RLS checks.';
COMMENT ON FUNCTION public.app_has_workspace_access(uuid) IS
  'Returns true when the current authenticated user is an active member of the target workspace.';
COMMENT ON FUNCTION public.app_has_workspace_role(uuid, text[]) IS
  'Returns true when the current authenticated user has one of the requested active roles in the target workspace.';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS workspaces_select_member ON public.workspaces;
CREATE POLICY workspaces_select_member
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.app_has_workspace_access(id)
  );

DROP POLICY IF EXISTS workspaces_insert_owner ON public.workspaces;
CREATE POLICY workspaces_insert_owner
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS workspaces_update_manager ON public.workspaces;
CREATE POLICY workspaces_update_manager
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.app_has_workspace_role(id, ARRAY['owner', 'admin']::text[])
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    OR public.app_has_workspace_role(id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS workspace_members_select_scoped ON public.workspace_members;
CREATE POLICY workspace_members_select_scoped
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS workspace_members_insert_manager ON public.workspace_members;
CREATE POLICY workspace_members_insert_manager
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS workspace_members_update_manager ON public.workspace_members;
CREATE POLICY workspace_members_update_manager
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  )
  WITH CHECK (
    public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS workspace_members_delete_manager ON public.workspace_members;
CREATE POLICY workspace_members_delete_manager
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS brand_voice_profiles_select_member ON public.brand_voice_profiles;
CREATE POLICY brand_voice_profiles_select_member
  ON public.brand_voice_profiles
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS brand_voice_profiles_insert_member ON public.brand_voice_profiles;
CREATE POLICY brand_voice_profiles_insert_member
  ON public.brand_voice_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS brand_voice_profiles_update_member ON public.brand_voice_profiles;
CREATE POLICY brand_voice_profiles_update_member
  ON public.brand_voice_profiles
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS brand_voice_profiles_delete_member ON public.brand_voice_profiles;
CREATE POLICY brand_voice_profiles_delete_member
  ON public.brand_voice_profiles
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sender_profiles_select_member ON public.sender_profiles;
CREATE POLICY sender_profiles_select_member
  ON public.sender_profiles
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS sender_profiles_insert_member ON public.sender_profiles;
CREATE POLICY sender_profiles_insert_member
  ON public.sender_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sender_profiles_update_member ON public.sender_profiles;
CREATE POLICY sender_profiles_update_member
  ON public.sender_profiles
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sender_profiles_delete_member ON public.sender_profiles;
CREATE POLICY sender_profiles_delete_member
  ON public.sender_profiles
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS prompt_templates_select_scoped ON public.prompt_templates;
CREATE POLICY prompt_templates_select_scoped
  ON public.prompt_templates
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NULL
    OR public.app_has_workspace_access(workspace_id)
  );

DROP POLICY IF EXISTS prompt_templates_insert_workspace_manager ON public.prompt_templates;
CREATE POLICY prompt_templates_insert_workspace_manager
  ON public.prompt_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS prompt_templates_update_workspace_manager ON public.prompt_templates;
CREATE POLICY prompt_templates_update_workspace_manager
  ON public.prompt_templates
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  )
  WITH CHECK (
    workspace_id IS NOT NULL
    AND public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS prompt_templates_delete_workspace_manager ON public.prompt_templates;
CREATE POLICY prompt_templates_delete_workspace_manager
  ON public.prompt_templates
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[])
  );

DROP POLICY IF EXISTS campaigns_select_member ON public.campaigns;
CREATE POLICY campaigns_select_member
  ON public.campaigns
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS campaigns_insert_member ON public.campaigns;
CREATE POLICY campaigns_insert_member
  ON public.campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS campaigns_update_member ON public.campaigns;
CREATE POLICY campaigns_update_member
  ON public.campaigns
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS campaigns_delete_member ON public.campaigns;
CREATE POLICY campaigns_delete_member
  ON public.campaigns
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS prospects_select_member ON public.prospects;
CREATE POLICY prospects_select_member
  ON public.prospects
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS prospects_insert_member ON public.prospects;
CREATE POLICY prospects_insert_member
  ON public.prospects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS prospects_update_member ON public.prospects;
CREATE POLICY prospects_update_member
  ON public.prospects
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS prospects_delete_member ON public.prospects;
CREATE POLICY prospects_delete_member
  ON public.prospects
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS research_snapshots_select_member ON public.research_snapshots;
CREATE POLICY research_snapshots_select_member
  ON public.research_snapshots
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS research_snapshots_insert_member ON public.research_snapshots;
CREATE POLICY research_snapshots_insert_member
  ON public.research_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS research_snapshots_update_member ON public.research_snapshots;
CREATE POLICY research_snapshots_update_member
  ON public.research_snapshots
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS research_snapshots_delete_member ON public.research_snapshots;
CREATE POLICY research_snapshots_delete_member
  ON public.research_snapshots
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sequences_select_member ON public.sequences;
CREATE POLICY sequences_select_member
  ON public.sequences
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS sequences_insert_member ON public.sequences;
CREATE POLICY sequences_insert_member
  ON public.sequences
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sequences_update_member ON public.sequences;
CREATE POLICY sequences_update_member
  ON public.sequences
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS sequences_delete_member ON public.sequences;
CREATE POLICY sequences_delete_member
  ON public.sequences
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS conversation_threads_select_member ON public.conversation_threads;
CREATE POLICY conversation_threads_select_member
  ON public.conversation_threads
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS conversation_threads_insert_member ON public.conversation_threads;
CREATE POLICY conversation_threads_insert_member
  ON public.conversation_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS conversation_threads_update_member ON public.conversation_threads;
CREATE POLICY conversation_threads_update_member
  ON public.conversation_threads
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS conversation_threads_delete_member ON public.conversation_threads;
CREATE POLICY conversation_threads_delete_member
  ON public.conversation_threads
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS messages_select_member ON public.messages;
CREATE POLICY messages_select_member
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_insert_member
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS messages_update_member ON public.messages;
CREATE POLICY messages_update_member
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS messages_delete_member ON public.messages;
CREATE POLICY messages_delete_member
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS reply_analyses_select_member ON public.reply_analyses;
CREATE POLICY reply_analyses_select_member
  ON public.reply_analyses
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS reply_analyses_insert_member ON public.reply_analyses;
CREATE POLICY reply_analyses_insert_member
  ON public.reply_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS reply_analyses_update_member ON public.reply_analyses;
CREATE POLICY reply_analyses_update_member
  ON public.reply_analyses
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS reply_analyses_delete_member ON public.reply_analyses;
CREATE POLICY reply_analyses_delete_member
  ON public.reply_analyses
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS draft_replies_select_member ON public.draft_replies;
CREATE POLICY draft_replies_select_member
  ON public.draft_replies
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS draft_replies_insert_member ON public.draft_replies;
CREATE POLICY draft_replies_insert_member
  ON public.draft_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS draft_replies_update_member ON public.draft_replies;
CREATE POLICY draft_replies_update_member
  ON public.draft_replies
  FOR UPDATE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]))
  WITH CHECK (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS draft_replies_delete_member ON public.draft_replies;
CREATE POLICY draft_replies_delete_member
  ON public.draft_replies
  FOR DELETE
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin', 'member']::text[]));

DROP POLICY IF EXISTS usage_events_select_manager ON public.usage_events;
CREATE POLICY usage_events_select_manager
  ON public.usage_events
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[]));

DROP POLICY IF EXISTS audit_events_select_manager ON public.audit_events;
CREATE POLICY audit_events_select_manager
  ON public.audit_events
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[]));

DROP POLICY IF EXISTS subscriptions_select_manager ON public.subscriptions;
CREATE POLICY subscriptions_select_manager
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.app_has_workspace_role(workspace_id, ARRAY['owner', 'admin']::text[]));
