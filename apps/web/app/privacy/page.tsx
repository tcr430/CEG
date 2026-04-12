import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "OutFlow privacy summary.",
};

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Privacy"
      description="This page is a concise product-facing privacy summary for the current application."
    >
      <div className="publicInfoStack">
        <section>
          <h2>Current posture</h2>
          <p>
            OutFlow stores workspace-scoped product data needed to support research,
            drafting, reply handling, billing state, and operational history. The
            application is designed to keep server-only secrets on the server side.
          </p>
        </section>
        <section>
          <h2>Controlled handling</h2>
          <p>
            The product emphasizes reviewability, workspace separation, and
            structured operational records. It does not present autonomous sending as
            part of the current workflow.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
