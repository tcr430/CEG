import type { ReactNode } from "react";

import type { PricingPlanPresentation } from "../lib/pricing-content";

type PricingPlanCardProps = {
  plan: PricingPlanPresentation;
  badge?: string;
  active?: boolean;
  actions?: ReactNode;
  footnote?: string;
  className?: string;
};

export function PricingPlanCard({
  plan,
  badge,
  active = false,
  actions,
  footnote,
  className,
}: PricingPlanCardProps) {
  const classes = [
    "pricingCard",
    plan.featured ? "featuredPricingCard" : null,
    active ? "activePricingCard" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} data-plan={plan.code}>
      <div className="pricingCardHeader">
        <div>
          <p className="cardLabel">{plan.label}</p>
          <h3>{plan.headline}</h3>
        </div>
        {badge ? <span className="pill">{badge}</span> : null}
      </div>
      <p>{plan.summary}</p>
      <p className="pricingAudience">{plan.audience}</p>
      <ul className="pricingBulletList">
        {plan.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {actions ? <div className="inlineActions pricingActionRow">{actions}</div> : null}
      {footnote ? <p className="pricingFootnote">{footnote}</p> : null}
    </article>
  );
}
