# Trust Language Summary

## Where trust language was added

- `apps/web/app/page.tsx`
- `apps/web/app/app/onboarding/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
- `apps/web/app/app/settings/page.tsx`

## Exact principle being conveyed in each place

### Homepage
- Principle conveyed: the product proposes research-backed outreach and reply options, but operators review, edit, and approve what gets used.
- Why here: this is the first public reassurance point, where visitors need to understand that the product is a controlled workflow system rather than an autonomous sender.

### Onboarding
- Principle conveyed: the setup flow leads into research, sequence, and reply-draft suggestions, but the team still reviews and edits what gets used.
- Why here: onboarding is where a new workspace forms its expectations about how generation works before users run the first workflow.

### Prospect workflow generation and reply surfaces
- Principle conveyed: research outputs, sequences, reply analyses, and draft replies are proposed workflow artifacts for review; users decide what to edit, save, draft in Gmail, or use.
- Why here: this is the highest-trust part of the product because it sits directly on generation, reply handling, and inbox draft actions.

### Settings and data handling
- Principle conveyed: Gmail actions create reviewable drafts rather than auto-sent messages, and structured exports preserve operational history around drafts, edits, and approvals where the product stores it.
- Why here: settings is where users look for reassurance about control, privacy, and what the system records.

## Any related existing copy that was removed or softened

- Softened generic human-review wording on the homepage into a clearer statement of who decides what gets used.
- Changed prospect detail CTA copy from generic `Generate reply drafts` to `Generate reply draft options` so the output reads more clearly as suggestions.
- Changed inbox draft labels from generic `Create draft in Gmail` and `Draft in Gmail` wording to review-oriented language.
- Changed edit-save labels on prospect workflow artifacts from `Save edited ...` to `Save reviewed ...` where that better reflects the trust model.

## Why each placement was chosen

- Homepage: communicates the trust posture before sign-in without overloading the page.
- Onboarding: shapes user expectations before the first generation run.
- Prospect workflow: places reassurance exactly where users encounter model outputs and inbox draft actions.
- Settings/data handling: reinforces control over drafts, exports, and stored operational history.