import type { ReactNode } from "react";

import { MarketingFooter } from "./marketing-footer";
import { PublicLandingNav } from "./public-landing-nav";

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PublicInfoPage({
  eyebrow,
  title,
  description,
  children,
}: PublicInfoPageProps) {
  return (
    <main className="publicSiteShell">
      <PublicLandingNav isAuthenticated={false} />
      <section className="publicInfoIntro">
        <div className="publicInfoHero">
          <p className="marketingEyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="publicInfoLead">{description}</p>
        </div>
      </section>
      <section className="publicSection">
        <div className="publicPanel publicInfoPanel">{children}</div>
      </section>
      <MarketingFooter />
    </main>
  );
}
