import Link from "next/link";
import type { ReactNode } from "react";

type PublicCtaBandProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function PublicCtaBand({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: PublicCtaBandProps) {
  return (
    <section className="publicSection publicPreFooterSection" aria-labelledby="public-cta-band-title">
      <div className="publicPreFooterBand">
        <div className="publicPreFooterCopy">
          <p className="marketingEyebrow">{eyebrow}</p>
          <h2 id="public-cta-band-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="publicActionRow publicPreFooterActions">
          <Link href={primaryHref} className="marketingPrimaryCta">
            {primaryLabel}
          </Link>
          {secondaryLabel && secondaryHref ? (
            <Link href={secondaryHref} className="marketingSecondaryCta">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
