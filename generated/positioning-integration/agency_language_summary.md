# Agency Language Summary

## Files changed
- `apps/web/app/app/page.tsx`
- `apps/web/app/app/campaigns/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
- `apps/web/app/app/sender-profiles/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `apps/web/lib/empty-state-guidance.ts`
- `apps/web/lib/upgrade-prompts.ts`
- `apps/web/components/performance-summary-card.tsx`
- `apps/web/components/app-shell-nav.tsx`
- `generated/positioning-integration/agency_language_summary.md`

## Key terminology changes
- Shifted dashboard and campaign framing from generic `outbound workflow` and `campaign planning` language toward `client work`, `campaign workflow`, `client campaign`, and `controlled workflow` language.
- Reframed sender profiles as reusable context for client work instead of a generic profile library.
- Reframed prospect detail as a `prospect workflow` with `workflow guardrails`, `workflow run status`, `client thread`, and `operational memory`.
- Updated upgrade prompts to talk about workflow capacity, campaign learning, and reply handling instead of generic upgrade nudges.
- Updated performance summary and navigation labels to sound more like an agency operating surface.

## Key helper and empty-state changes
- Empty-state guidance now speaks more directly to reusable briefs, team review, client-facing outbound, and reusable context.
- Dashboard quick-start copy now points users toward building the next client workflow rather than following a generic demo path.
- Campaign list and campaign detail copy now emphasize client campaign briefs, target accounts, and campaign learning.
- Settings copy now better reflects workspace operations for teams managing client work.
- Prospect detail helper text now emphasizes reviewability, reusable research snapshots, and campaign memory instead of generic generation language.

## Places where current information architecture still limits agency framing
- The product still uses `workspace` as the top-level container rather than an explicit client/account hierarchy, so some surfaces cannot fully speak in client-account terms without overpromising the structure.
- Billing and plan labels still use the live implementation names rather than the newer strategic packaging, so some authenticated upgrade language remains bounded by current pricing architecture.
- Sender types still include SDR, founder, agency, and basic modes in the core workflow, so the language can be agency-first but cannot honestly erase the broader supported modes.
- Some form structures and page organization are still campaign/prospect-centric rather than explicitly client-portfolio-centric, which limits how far the copy can go without changing navigation or data model boundaries.