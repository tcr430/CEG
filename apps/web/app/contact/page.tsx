import type { Metadata } from "next";
import Link from "next/link";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact OutFlow for pricing, onboarding, and workflow questions for your agency.",
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Company"
      title="Contact OutFlow"
      description="Use this page for pricing questions, implementation walkthroughs, and agency onboarding support."
    >
      <div className="publicInfoStack">
        <section>
          <h2>Email</h2>
          <p>
            Reach us at{" "}
            <Link href="mailto:hello@outflow.app" className="publicInlineLink">
              hello@outflow.app
            </Link>
            .
          </p>
        </section>
        <section>
          <h2>When to contact us</h2>
          <p>
            Contact us for plan selection, rollout planning, billing support, or a
            walkthrough of how OutFlow fits your current agency workflow.
          </p>
        </section>
        <section>
          <h2>What to include for faster help</h2>
          <p>
            Share your agency size, active client volume, and where your outbound
            workflow currently breaks. We will respond with the most relevant next step.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
