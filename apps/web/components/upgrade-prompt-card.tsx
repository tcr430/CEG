import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  return (
    <Card className={`p-5 nestedCard${prompt.tone === "strong" ? " warningCard" : ""}`}>
      <p className="cardLabel">{prompt.eyebrow}</p>
      <h3>{prompt.title}</h3>
      <p>{prompt.body}</p>
      <div className="inlineActions pricingActionRow">
        <form action="/api/billing/checkout" method="post">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="planCode" value={prompt.targetPlanCode} />
          <SubmitButton variant="secondary" pendingLabel="Starting checkout...">
            {prompt.ctaLabel}
          </SubmitButton>
        </form>
        <Button asChild variant="ghost">
          <Link href={`/app/settings?workspace=${workspaceId}#billing-plans`}>See plan details</Link>
        </Button>
      </div>
    </Card>
  );
}
