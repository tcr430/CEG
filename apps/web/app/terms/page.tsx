import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "OutFlow terms summary.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Terms"
      description="This page provides a concise current-application terms summary for early product access."
    >
      <div className="publicInfoStack">
        <section>
          <h2>Use of the product</h2>
          <p>
            OutFlow is intended for legitimate outbound workflow support. Users are
            responsible for reviewing outputs, handling account access securely, and
            using the product in line with applicable law and customer obligations.
          </p>
        </section>
        <section>
          <h2>Current product reality</h2>
          <p>
            The application supports structured research, drafting, reply handling,
            and inbox draft handoff. It should not be understood as an autonomous
            outbound execution system.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
