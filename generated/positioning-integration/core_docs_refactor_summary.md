# Core Docs Refactor Summary

## Files changed
- `README.md`
- `ARCHITECTURE.md`
- `DATA_STRATEGY.md`
- `DEPLOYMENT.md`
- `generated/positioning-integration/core_docs_refactor_summary.md`

## Major strategic language changes per file

### `README.md`
- Reframed the product as an agency-first operating system for hyperpersonalized cold email.
- Repositioned the primary ICP toward small-to-mid outbound agencies serving B2B clients.
- Shifted top-level language from broad "copilot/generator" framing toward workflow ownership, human review, campaign learning, and operational memory.
- Kept supported secondary modes truthful by describing sender-aware and basic fallback support without presenting SDRs/founders as the primary business positioning.
- Added an explicit note that doctrine-level plan names are now `Starter`, `Growth`, and `Enterprise` while implementation still uses `Free`, `Pro`, and `Agency`.

### `ARCHITECTURE.md`
- Added product/system framing that supports agency operating workflows, operational memory, campaign learning, and human-in-the-loop control.
- Clarified that provider abstraction supports a proposing system inside a broader human-reviewed workflow.
- Reinforced that async readiness does not imply autonomous outbound execution.
- Strengthened the observability/security framing around retained campaign history and reviewable operational memory.
- Added a clear note about the strategic plan-name shift versus current implementation naming.

### `DATA_STRATEGY.md`
- Reframed the purpose around structured operational memory, workflow quality, evaluation, and future optimization readiness.
- Expanded the stored-signal framing to include campaign history, thread history, edits, approvals, and linked operational context.
- Added explicit, conservative moat framing:
  - workflow moat
  - memory moat
  - learning moat
- Kept the wording grounded in supported structured signals and future optimization readiness rather than implying autonomous system improvement.

### `DEPLOYMENT.md`
- Updated the opening framing so the deployment guide reads like infrastructure for an agency-grade workflow system with human-reviewed AI output.
- Replaced old plan references in the Stripe section with doctrine-level names first: `Starter`, `Growth`, and `Enterprise`.
- Added a direct note that current implementation still uses `Free`, `Pro`, and `Agency` internally and in pricing UI.
- Preserved all deployment, auth, migration, Gmail, provider, and Vercel instructions as operationally accurate.

## Old assumptions removed
- The docs no longer present SDRs, SaaS founders, and agencies as equally primary ICPs.
- The docs no longer lean on broad "AI copilot" or generic "generator" framing as the main product description.
- The docs no longer imply the product should be understood primarily as one-shot generation rather than workflow ownership.
- The deployment guide no longer assumes the old plan names are the right doctrine-level framing.

## Unresolved inconsistencies
- The current implementation and pricing UI still use `Free`, `Pro`, and `Agency`, while the updated doctrine docs use `Starter`, `Growth`, and `Enterprise`.
- Some repo surfaces outside these four doctrine docs may still reflect the older broader ICP and "copilot" language.
- The product still supports SDR/founder/basic workflows in implementation, so the strategic agency-first framing necessarily coexists with broader supported-mode truth in the codebase.

## Wording intentionally kept conservative
- The docs do not claim autonomous outbound execution.
- The docs do not imply automatic sending.
- The docs do not claim the system self-optimizes campaigns today.
- The docs describe memory, workflow, and learning moats as foundations grounded in structured data, not as proven commercial outcomes.
- The docs preserve technical truth that Gmail is the first concrete inbox provider path today.

## AGENTS.md status
- `AGENTS.md` was left unchanged.
