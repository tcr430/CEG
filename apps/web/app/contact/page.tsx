import type { Metadata } from "next";
import Link from "next/link";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact OutFlow.",
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Company"
      title="Contact OutFlow"
      description="For product questions, early access conversations, or operational follow-up, use the contact route below."
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
          <h2>What to include</h2>
          <p>
            A short note about your agency, outbound workflow, and what you want to
            evaluate will help us respond with the most relevant next step.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
