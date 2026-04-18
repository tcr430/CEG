import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy summary for OutFlow and agency workspace data handling.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Privacy summary"
      description="This page explains how OutFlow handles data in the current product stage."
    >
      <div className="publicInfoStack">
        <section>
          <h2>Data we process in the product</h2>
          <p>
            OutFlow stores workspace-scoped records needed to run campaign setup,
            prospect research, draft review, reply handling, and billing state. The
            platform is designed to keep secret credentials and server-side keys out
            of browser-exposed code paths.
          </p>
        </section>
        <section>
          <h2>How control is preserved</h2>
          <p>
            The current workflow emphasizes reviewability and workspace separation.
            OutFlow does not present autonomous sending as part of the product today.
          </p>
        </section>
        <section>
          <h2>Operational note</h2>
          <p>
            This is a concise product-facing privacy summary, not a full legal
            policy set. For account-specific questions, contact{" "}
            <a href="mailto:hello@outflow.app" className="publicInlineLink">
              hello@outflow.app
            </a>
            .
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
