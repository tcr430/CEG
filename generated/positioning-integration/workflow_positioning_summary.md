# Workflow Positioning Summary

## Where the app previously felt tool-like rather than workflow-like

- `apps/web/app/app/page.tsx`
  - The dashboard quick-start area read like separate setup actions rather than one continuous operating flow.
- `apps/web/app/app/campaigns/page.tsx`
  - The portfolio view already grouped campaigns well, but some labels still read like a list of campaigns instead of a workflow portfolio with outcomes and learning.
- `apps/web/app/app/campaigns/[campaignId]/page.tsx`
  - The campaign detail page had the right data, but some sections still felt like isolated records instead of brief -> queue -> outcomes.
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
  - The prospect page had the strongest workflow mechanics, but several labels and CTAs still emphasized isolated actions like generation rather than progression through stages.
- `apps/web/lib/empty-state-guidance.ts`
  - Empty states were already good, but some titles and next actions still centered `generate` rather than moving through research, draft, review, and reply stages.

## What changed

- Dashboard copy now frames the home surface as a workflow path, with setup, brief, queue, and headroom cues instead of a simple quick-start list.
- Campaign list copy now reads more like a workflow portfolio, with labels emphasizing workflow coverage, outcome signals, and learning signals.
- Campaign detail copy now frames the page around the workflow brief, target account queue, and outcome signals.
- Prospect detail copy now uses more stage-based terminology:
  - research stage
  - sequence draft
  - reply workflow
  - workflow stages
  - workflow memory
- Prospect CTAs were adjusted to read as workflow progression instead of one-shot tool actions, for example:
  - `Run research step`
  - `Create sequence draft`
  - `Run reply analysis`
  - `Add latest sequence draft to thread`
- Empty states now point more clearly toward the sequence of work: setup -> research -> draft -> review -> replies.

## Remaining structural limitations preventing stronger workflow positioning

- The current information architecture is still centered on workspaces, campaigns, and prospects rather than an explicit stage-based workflow object, so copy can reinforce continuity but cannot fully visualize a pipeline on its own.
- Several server actions and success messages still use generation-oriented naming internally, which is accurate technically but keeps parts of the product language closer to discrete actions.
- The product still uses a single prospect detail page for research, drafting, review, inbox draft handling, and reply work, so stronger workflow framing is limited by the lack of a dedicated stage navigator or progress rail.
- The current data model does not yet include a first-class client/account hierarchy above campaigns, so some agency workflow framing still has to live in language rather than structure.