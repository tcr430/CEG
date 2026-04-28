import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type ActionEmptyStateProps = {
  label: string;
  title: string;
  description: string;
  nextAction?: string;
  actions?: ReactNode;
};

export function ActionEmptyState({
  label,
  title,
  description,
  nextAction,
  actions,
}: ActionEmptyStateProps) {
  return (
    <Card className="p-5 emptyStateCard">
      <p className="cardLabel">{label}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {nextAction ? (
        <p className="text-sm text-muted-foreground emptyStateHint">Next best action: {nextAction}</p>
      ) : null}
      {actions ? <div className="inlineActions emptyStateActions">{actions}</div> : null}
    </Card>
  );
}
