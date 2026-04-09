# Memory Moat Visibility

## Files changed
- `apps/web/app/app/page.tsx`
- `apps/web/app/app/onboarding/page.tsx`
- `apps/web/app/app/sender-profiles/page.tsx`
- `apps/web/app/app/sender-profiles/[senderProfileId]/page.tsx`
- `apps/web/app/app/campaigns/[campaignId]/prospects/[prospectId]/page.tsx`
- `apps/web/app/app/settings/page.tsx`
- `generated/positioning-integration/memory_moat_visibility.md`

## Where memory is actually present in the product today
- Sender profiles already preserve reusable sender voice, proof points, positioning, and workflow goals at the workspace level.
- Campaign records already preserve campaign briefs, ICP framing, offer summaries, and workflow preferences.
- Prospect records and research snapshots already preserve grounded account context, extracted evidence, and confidence-aware research summaries.
- Thread and reply workflow already preserve inbound messages, outbound draft history, reply analyses, and reply-draft versions.
- Gmail inbox integration already preserves imported thread/message references as workspace-scoped context.
- Settings and data-handling flows already expose operational history around exports, deletion requests, provider posture, and workspace controls.

## How the product now communicates this better
- Dashboard copy now explains that the workspace becomes more useful as it accumulates sender context, campaign briefs, target accounts, reply history, and outcome signals.
- Sender profile list/detail pages now frame profiles as stored operational context rather than just reusable form entries.
- Onboarding now tells users that stored campaign, prospect, and reply context compounds over time instead of resetting every workflow.
- Prospect detail now makes memory explicit at the account level: research snapshots, draft history, inbox context, and reply handling all live on the same prospect record.
- Settings now describe workspace profile, inbox imports, and data handling as part of the stored workspace context and operational record.

## Future work needed to strengthen the moat further
- Cross-campaign reuse is still mostly implied through stored records and prompt context; the UI does not yet expose strong memory views across clients or campaigns.
- Approved messaging logic, edit patterns, and selection history exist in parts of the system, but the product does not yet surface them as a dedicated reusable memory library.
- Campaign-history and outcome-history views are still lightweight; richer summaries, pattern surfacing, and comparisons would make the moat more visible.
- Inbox memory is Gmail-first today, so broader provider coverage and more explicit thread-history summaries would deepen the story.
- The current information architecture still emphasizes page-level tasks more than a unified context graph, so some of the moat is communicated through copy rather than dedicated product surfaces.
