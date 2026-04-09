# Onboarding Agency Refactor

## Files changed

- `apps/web/app/app/onboarding/page.tsx`
- `apps/web/lib/server/onboarding-state.ts`

## Before/after onboarding framing

### Before
- The onboarding flow was already clean and usable, but it read more like a generic first-run setup for outbound work.
- Agency support was present as one user-type choice, but the overall flow did not strongly signal that agency operators are the primary fit.
- Several steps still emphasized setup for generation rather than setup for a reusable outbound workflow.

### After
- The onboarding flow now frames setup as establishing workflow context for agency-grade hyperpersonalized cold email.
- The intro and completion states now emphasize quick guided setup, human control, and the idea that the system becomes more useful as operational memory builds.
- The user-type step now makes the agency path primary while still preserving SDR, founder, and basic fallback modes.
- Campaign and prospect steps now read more like creating a client workflow brief and first target account rather than just enabling later generation.

## Agency-specific improvements made

- Reframed the hero and progress copy around agency workflow setup instead of generic first-run setup.
- Made the agency option the first visible workflow-shape choice.
- Changed `Lead gen agency` to `Outbound agency` in onboarding-facing labels.
- Added an explicit note in the user-type step that agencies are the primary fit, especially for multi-client delivery and manual-heavy personalization.
- Updated campaign examples and placeholders to feel more client-workflow-oriented.
- Updated sender-profile copy to emphasize reusable context for later drafts and client delivery.
- Updated the prospect step to read as adding the first target account, not just adding a prospect record.

## Trust/workflow/memory concepts introduced

- Trust: onboarding now states that the system will later propose research, sequences, and reply drafts, while the team still reviews and edits what gets used.
- Workflow: step descriptions and CTAs now emphasize workflow context, workflow brief, workflow shape, and target-account setup.
- Memory: the intro and completion state now say more clearly that the product becomes more useful as campaign and workflow memory builds over time.

## Any onboarding limitations caused by current schema or flow structure

- The current onboarding flow is still workspace-first, not client-account-first, because the schema does not yet include a dedicated client hierarchy above campaigns.
- The step model still centers on one sender profile, one campaign, and one prospect as the first-run path, so agency framing has to live mostly in copy rather than a more explicitly multi-client onboarding structure.
- The user-type selector remains a simple set of buttons rather than a richer guided branching experience, which keeps onboarding fast but limits how much agency-specific explanation can be embedded without making the screen heavy.