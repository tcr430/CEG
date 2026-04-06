import Link from "next/link";

import { SubmitButton } from "./submit-button";
import type { UpgradePrompt } from "../lib/upgrade-prompts";

type UpgradePromptCardProps = {
  workspaceId: string;
  prompt: UpgradePrompt;
};

export function UpgradePromptCard({
  workspaceId,
  prompt,
}: UpgradePromptCardProps) {
  const cardClasses = [
    "dashboardCard",
    "nestedCard",
    prompt.tone === "strong" ? "warningCard" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClasses}>
      <p className="cardLabel">{prompt.eyebrow}</p>
      <h3>{prompt.title}</h3>
      <p>{prompt.body}</p>
      <div className="inlineActions pricingActionRow">
        <form action="/api/billing/checkout" method="post">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="planCode" value={prompt.targetPlanCode} />
          <SubmitButton
            className="buttonSecondary"
            pendingLabel="Starting checkout..."
          >
            {prompt.ctaLabel}
          </SubmitButton>
        </form>
        <Link href={`/app/settings?workspace=${workspaceId}#billing-plans`} className="buttonGhost">
          See plan details
        </Link>
      </div>
    </div>
  );
}
