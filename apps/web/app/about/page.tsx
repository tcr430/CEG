import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "About",
  description: "About OutFlow.",
};

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="Company"
      title="OutFlow is built for agency-grade outbound workflow."
      description="The product is designed to help outbound teams run a more structured cold-email workflow with visible review, reusable context, and controlled execution."
    >
      <div className="publicInfoStack">
        <section>
          <h2>What the product is</h2>
          <p>
            OutFlow is positioned as an operating system for hyperpersonalized cold
            email. It supports context setup, research, drafting, reply handling,
            and campaign history inside one workflow.
          </p>
        </section>
        <section>
          <h2>How it is intended to be used</h2>
          <p>
            The current product is built around serious outbound work where human
            review remains visible. AI proposes, while operators review, edit, and
            approve what moves forward.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
