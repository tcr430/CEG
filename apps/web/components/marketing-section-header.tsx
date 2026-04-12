import type { ReactNode } from "react";

type MarketingSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  centered?: boolean;
};

export function MarketingSectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: MarketingSectionHeaderProps) {
  return (
    <div
      className={[
        "marketingSectionHeader",
        centered ? "marketingSectionHeaderCentered" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="marketingEyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <div className="marketingSectionCopy">{description}</div> : null}
    </div>
  );
}
