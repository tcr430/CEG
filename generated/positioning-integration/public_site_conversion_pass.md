# Public Site Conversion Pass

## Scope Applied

This pass focused on public acquisition surfaces only:
- homepage (`/`)
- pricing (`/pricing`)
- sign-in (`/sign-in`)
- create-account (`/create-account`)
- shared public components (nav/footer/pricing content/styles)

## Pages / Components Changed

- `apps/web/app/page.tsx`
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/sign-in/page.tsx`
- `apps/web/app/create-account/page.tsx`
- `apps/web/components/public-landing-nav.tsx`
- `apps/web/components/marketing-footer.tsx`
- `apps/web/lib/pricing-content.ts`
- `apps/web/app/globals.css`

## Before / After Messaging Strategy

### Before
- Messaging repeated similar ideas across many sections.
- Several headlines/subheads used abstract language and low-conviction phrasing.
- Trust and control were present but not consistently tied to concrete product behavior.
- CTA language changed too often (`Create workspace`, `Open workspace`, `View plans`, etc.).

### After
- Homepage was tightened to a clearer persuasion order:
  1. who it is for + value promise
  2. workflow breakdown problem
  3. mechanism (single operating workflow)
  4. trust model (`AI proposes, human approves`)
  5. proof-ready trust signals grounded in current behavior
  6. final CTA
- Copy was rewritten to be shorter, more concrete, and more buyer-oriented.
- Trust language is explicit and tied to real implementation boundaries (draft handoff, no autonomous sending, workspace scope).

## CTA Strategy Before / After

### Before
- Primary/secondary CTA labels varied and were not always lifecycle-consistent.
- Public labels mixed workspace, billing, and account terms in ways that could confuse first-time buyers.

### After
- Primary public CTA is normalized to:
  - signed out: `Create account`
  - signed in: `Choose plan` (routes to billing/plan-selection surface)
- Secondary CTA is normalized around plan comparison (`Compare plans`) or a clear contextual fallback.
- Footer and nav links were aligned to avoid conflicting label patterns.

## Key Copy Rewrites Implemented

- Homepage hero headline/subheadline rewritten for direct agency ICP clarity.
- Problem section rewritten to reduce verbosity and clarify operational pain.
- Mechanism section rewritten to emphasize workflow continuity and human review.
- Trust section rewritten around explicit principle: `AI proposes, human approves.`
- Final homepage CTA section rewritten to reflect account-first, plan-next lifecycle.
- Pricing intro + comparison intro rewritten for faster decision framing.
- Plan summaries/bullets in `pricing-content.ts` rewritten to be shorter and more operational.
- Sign-in/create-account intros rewritten to reflect separated account creation vs plan activation lifecycle.

## Trust / Credibility Improvements Added

- Explicit no-autonomous-sending claim retained and tightened.
- Draft handoff model language tightened (Gmail draft creation, not auto-delivery).
- Workspace-scoped separation called out as a trust signal.
- Proof section reframed as verifiable behavior claims without fabricated logos, metrics, or testimonials.

## Accessibility / Scanability Improvements Made

- Reduced oversized heading scales on key public sections.
- Removed forced heading line-break patterns in workflow cards.
- Tightened section spacing and reduced repeated long-form body copy.
- Improved CTA label clarity and consistency.
- Added dedicated auth hero sizing (`.authEntryHero`) to improve readability on sign-in/create-account pages.
- Removed non-featured pricing card scaling that reduced comparability and scanability.

## SEO-Oriented Adjustments Made

- Public copy now more directly reflects search-intent language:
  - outbound workflow for agencies
  - cold email workflow operations
  - human-reviewed drafting / no autonomous sending
- Internal links remain coherent between homepage, pricing, sign-in, and create-account.
- No keyword stuffing added.

## Intentionally Left Unchanged

- Core billing entitlement logic and server-side subscription gating were not reworked in this pass.
- Existing auth/billing architecture in progress was preserved to keep this diff targeted to messaging/conversion surfaces.
- No fabricated social proof, customer logos, or unsupported performance claims were introduced.
