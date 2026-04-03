import type { ReactNode } from "react";

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
    <div className="dashboardCard emptyStateCard">
      <p className="cardLabel">{label}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {nextAction ? (
        <p className="statusMessage emptyStateHint">Next best action: {nextAction}</p>
      ) : null}
      {actions ? <div className="inlineActions emptyStateActions">{actions}</div> : null}
    </div>
  );
}
