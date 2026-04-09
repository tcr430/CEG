# Workflow Moat Visibility

## Current UX Gaps That Hid The Workflow Moat
- The dashboard described the product as a workflow system, but the stage sequence from setup through iteration was implied rather than visible.
- The campaigns index showed campaign grouping and performance, but not the end-to-end operating path that campaigns are supposed to support.
- Campaign detail focused on the brief and prospect list, but it did not clearly show how a campaign should progress into research, drafting, reply handling, and learning.
- The prospect detail page had the right functional pieces, but they still read partly like separate AI tools instead of one continuous workflow.
- Empty-state guidance pointed users to single actions, but some of the “what comes next” language still understated the larger workflow chain.

## Improvements Made

### Shared Workflow Visibility Layer
- Added `apps/web/lib/workflow-visibility.ts` to define one reusable, stage-based representation of the outbound workflow moat.
- Added `apps/web/components/workflow-stage-strip.tsx` so the app can render the same workflow progression language consistently across surfaces.
- Added supporting styles in `apps/web/app/globals.css` for compact stage strips that fit the existing design system.

### Dashboard
- Added a top-level workflow-stage strip to `apps/web/app/app/page.tsx` so the workspace now shows a visible path from setup to iteration.
- Added stronger explanatory copy tying the dashboard action cards to the workflow sequence rather than a loose set of tasks.

### Campaign Library And Campaign Detail
- Added a workflow-stage strip to `apps/web/app/app/campaigns/page.tsx` so campaigns are framed as the operating layer where the workflow chain becomes visible.
- Strengthened campaign-card copy so opening a campaign clearly implies the next stages: target accounts, research, drafts, replies, and iteration.
- Added a workflow-progression strip to `apps/web/app/app/campaigns/[campaignId]/page.tsx` so a campaign reads as the spine linking context, queue, research, drafting, reply handling, and learning.
- Added clearer next-best-action language inside the campaign queue area so users understand how to move the workflow forward.

### Prospect Workflow
- Added a workflow-stage strip to `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx` so the full moat is visible at the prospect level.
- Reframed the research, draft, review, and reply sections as explicit stages, including:
  - `Stage 1 | Research snapshot`
  - `Stage 2` for creating a draft sequence for review
  - `Stage 3 | Review sequence draft`
  - `Stage 4` for reply handling and follow-through
- Tightened the hero and section copy so the prospect page reads like one end-to-end workflow record rather than a group of isolated AI actions.
- Updated empty-state CTA labels on the prospect page so they read like workflow stages rather than one-off generation buttons.

### Empty States
- Updated `apps/web/lib/empty-state-guidance.ts` so next-step guidance now more clearly links campaign creation, prospect addition, research, sequence drafting, reply analysis, and reply drafting into one continuous flow.

### Tests
- Extended `apps/web/tests/run-tests.mjs` with coverage for the shared workflow-visibility helper so the stage sequencing logic stays stable.

## Remaining Limitations
- The app still relies mostly on copy, stage strips, and sequencing cues rather than a deeper workflow-native information architecture.
- The campaign list cannot yet show research-stage depth per campaign because that data is not surfaced there in a richer summarized form.
- The prospect detail page still groups a large amount of detail on one screen, so the workflow is clearer than before but not yet broken into stronger review-oriented subviews.
- The current workflow-stage readiness uses lightweight derived signals from existing records; it is intentionally helpful and honest, but it is not a full workflow engine.
- Some stage transitions are inferred from available records rather than explicitly stored as first-class workflow milestones.

## Files Changed
- `apps/web/lib/workflow-visibility.ts`
- `apps/web/components/workflow-stage-strip.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/app/page.tsx`
- `apps/web/app/app/campaigns/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
- `apps/web/lib/empty-state-guidance.ts`
- `apps/web/tests/run-tests.mjs`
