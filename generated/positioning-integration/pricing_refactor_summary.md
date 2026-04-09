# Pricing Refactor Summary

## Files changed
- `README.md`
- `ARCHITECTURE.md`
- `DEPLOYMENT.md`
- `apps/web/app/layout.tsx`
- `apps/web/app/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/sign-in/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `apps/web/components/app-shell-nav.tsx`
- `apps/web/lib/pricing-content.ts`
- `apps/web/lib/upgrade-prompts.ts`
- `packages/billing/src/plans.ts`
- `apps/web/tests/run-tests.mjs`
- `infrastructure/demo-data/fixtures.ts`
- `packages/testing/src/evals/fixtures.ts`

## Internal identifiers before/after
- Preserved for compatibility:
  - `free`
  - `pro`
  - `agency`
- No plan codes, Stripe env var names, or stored billing identifiers were renamed.

## User-facing labels before/after
- `Free` -> `Starter`
- `Pro` -> `Growth`
- `Agency` -> `Enterprise`
- `Outbound Copilot` -> `OutFlow`

## Pricing page copy changes
- Updated plan cards, comparison headers, and checkout CTAs to use `Starter`, `Growth`, and `Enterprise`.
- Kept the packaging language outcome-oriented and workflow-based.
- Updated the public metadata description and brand copy to use `OutFlow`.

## Upgrade prompt changes
- Updated upgrade CTA labels and bodies from `Upgrade to Pro` / `Upgrade to Agency` to `Upgrade to Growth` / `Upgrade to Enterprise`.
- Kept targeting logic unchanged so prompt routing still upgrades `free -> pro` and `pro -> agency` under the hood.

## Compatibility decisions made
- Internal billing IDs were preserved to avoid breaking checkout, portal, webhook normalization, and stored plan references.
- Stripe env vars remain `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_AGENCY_MONTHLY` for the same reason.
- Demo and eval fixtures were updated only for brand-language consistency, not for entitlement logic.
- Operational docs now explain the distinction as: user-facing labels changed, internal billing codes remain stable.