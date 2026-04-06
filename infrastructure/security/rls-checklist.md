# RLS Checklist

Use this checklist after applying the workspace RLS and integrity migrations.

## Preconditions

- `supabase db push` or the equivalent SQL migrations have completed successfully.
- At least two test users exist.
- At least two workspaces exist.
- One user is an `owner` in workspace A and has no membership in workspace B.
- One user is a `member` in workspace A.

## Verify member scope

1. Sign in as the member of workspace A.
2. Confirm reads succeed for workspace-A rows in:
   - `workspaces`
   - `sender_profiles`
   - `campaigns`
   - `prospects`
   - `research_snapshots`
   - `sequences`
   - `conversation_threads`
   - `messages`
   - `reply_analyses`
   - `draft_replies`
3. Confirm reads fail for workspace-B rows.
4. Confirm writes fail when attempting to point a workspace-A record at a workspace-B foreign key.

## Verify owner/admin scope

1. Sign in as the owner or admin of workspace A.
2. Confirm reads succeed for workspace-A rows in:
   - `usage_events`
   - `audit_events`
   - `subscriptions`
3. Confirm a non-owner/member cannot read those same tables for the workspace.

## Verify service-role boundaries

1. Confirm webhook and operational server flows still work with `SUPABASE_SERVICE_ROLE_KEY` configured.
2. Confirm no client bundle or `NEXT_PUBLIC_*` variable includes the service-role key.
3. Confirm internal admin routes still require both server-side authorization and allowlisted emails.
