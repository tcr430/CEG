# Onboarding Guidance Summary

## Files Changed
- `apps/web/app/app/onboarding/page.tsx`
- `apps/web/lib/onboarding-guidance.ts`
- `apps/web/app/globals.css`
- `apps/web/tests/run-tests.mjs`

## What Interactive Guidance Was Added
- Added a new guided-setup panel near the top of onboarding that explains the current recommended path, the immediate next step, and why the setup matters for workflow continuity.
- Added persona-specific onboarding guidance for `agency`, `sdr`, `saas_founder`, `basic`, and the pre-selection state.
- Added step-level helper copy that explains what each stage unlocks next instead of only showing forms.
- Added more explicit progress framing so onboarding reads like a workflow foundation process rather than a set of disconnected records.
- Added richer inline examples and placeholders for sender profile, campaign, and target-account creation.
- Added clearer completion cues inside each step so users know what has already been established and what comes next.

## Static Vs Dynamic Guidance

### Static
- Hero framing and overall onboarding promise.
- Progress framing language.
- The general explanation that onboarding is about workflow context, human review, and reusable operational memory.
- Step-specific helper text that is useful regardless of persona, such as why a workspace matters or why one real account is enough to start.

### Dynamic
- Persona guidance changes based on selected workflow shape.
- The recommended-path panel changes based on the next incomplete onboarding step.
- Sender-profile, campaign, and prospect placeholders/examples change based on the selected workflow shape.
- Success/follow-on messaging changes based on whether each step is complete and whether the user is in basic mode.
- Workflow-shape selection cards now show contextual helper text, current selection state, and plan-based availability.

## Future Improvements That Could Make Onboarding More Assistant-Like
- Persist lightweight onboarding recommendations server-side so the app can adapt guidance from actual workspace state over time instead of only current counts and selections.
- Add inline “why we recommend this” explainers driven by actual billing plan, team role, and seed/demo context.
- Add small preview states showing what research, drafts, and reply handling will look like once each setup stage is complete.
- Add optional smart suggestions that prefill campaign or sender fields from known workspace metadata, while still keeping the user in approval control.
- Add post-step confirmation banners tied to saved records, not only query-string success messages.

## Implementation Tradeoffs
- Guidance logic was moved into `apps/web/lib/onboarding-guidance.ts` to keep React components presentational, but it is still copy- and placeholder-driven rather than backed by a richer recommendation engine.
- The onboarding flow structure and server actions were intentionally preserved, so the improvements are mostly framing, helper text, defaults, and dynamic recommendations rather than a deeper state-machine redesign.
- No new backend dependencies or persistence layers were added, which keeps the change low-risk but also limits how adaptive the onboarding can be today.
- The workflow remains form-based because that matches the current architecture; the new assistance layer is meant to make those forms feel guided rather than abrupt.
