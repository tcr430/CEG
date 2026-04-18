import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms summary for current OutFlow product access.",
};

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Terms summary"
      description="This page outlines practical usage expectations for the current OutFlow product."
    >
      <div className="publicInfoStack">
        <section>
          <h2>Acceptable product use</h2>
          <p>
            OutFlow is intended for legitimate outbound workflow operations. Customers
            are responsible for reviewing outputs, managing access securely, and
            operating in line with applicable law and client obligations.
          </p>
        </section>
        <section>
          <h2>Decision responsibility</h2>
          <p>
            OutFlow can generate draft and analysis suggestions, but users retain
            responsibility for review and approval. The current product should not be
            interpreted as autonomous outbound execution.
          </p>
        </section>
        <section>
          <h2>Current scope notice</h2>
          <p>
            This is a concise terms summary for the current product stage. It is
            intended to communicate operating expectations clearly while fuller legal
            documentation evolves.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
