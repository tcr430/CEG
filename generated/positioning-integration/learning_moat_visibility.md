# Learning Moat Visibility

## Files changed
- `apps/web/app/page.tsx`
- `apps/web/app/app/page.tsx`
- `apps/web/app/app/campaigns/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `apps/web/components/performance-summary-card.tsx`
- `apps/web/lib/upgrade-prompts.ts`
- `generated/positioning-integration/learning_moat_visibility.md`

## Where learning-related foundations exist in the repo
- Campaign performance snapshots already exist and are recalculated from normalized outbound and reply activity in `apps/web/lib/server/campaign-performance.ts`.
- Outcome-aware reply signals already exist through reply analysis, reply outcomes, and training-signal linkage in `apps/web/lib/server/replies.ts` and `apps/web/lib/server/training-signals.ts`.
- Deterministic performance hints already exist in `apps/web/lib/generation-performance-hints.ts`, based on accepted artifacts and outcome-linked signals rather than opaque ML behavior.
- Usage and audit event capture already exists across core flows and is surfaced in operational/internal views.
- Dataset export and evaluation groundwork already exist for future optimization work, but they remain internal and admin-oriented rather than user-facing.

## Wording introduced
- `performance signals`
- `campaign history preserved for more informed guidance`
- `lightweight snapshots ... give the workspace real campaign history`
- `performance-aware rather than purely generative`
- `campaign learning informed by history`
- `structured signals that make later guidance more informed over time`
- `usage evidence` and `real usage signals rather than guesswork`

## Where messaging was intentionally limited
- I did not describe the product as self-optimizing or autonomously improving campaigns because the repo currently supports structured signals, snapshots, and deterministic hints rather than autonomous optimization loops.
- I kept language around performance metrics deliberately modest: they are described as lightweight snapshots, conservative signals, and input to more informed guidance, not proof of lift.
- I did not imply that reply handling patterns automatically change live sending behavior, because the current system still relies on human review and approval.
- I did not claim user-facing learning dashboards or cross-campaign recommendation systems that do not yet exist as explicit product surfaces, even though the underlying data foundations are present.
