import type { Metadata } from "next";

import { PublicInfoPage } from "../../components/public-info-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn why OutFlow is focused on outbound agencies serving B2B clients.",
};

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="Company"
      title="OutFlow is built for outbound agencies."
      description="OutFlow helps agencies run personalized cold email with clearer workflow control from campaign setup to reply handling."
    >
      <div className="publicInfoStack">
        <section>
          <h2>What OutFlow is today</h2>
          <p>
            OutFlow is workflow software for agencies serving B2B clients. It keeps
            campaign context, prospect research, draft review, and reply handling in
            one operational system.
          </p>
        </section>
        <section>
          <h2>Why it exists</h2>
          <p>
            Agency delivery quality drops when work is scattered across prompts, docs,
            and inbox threads. OutFlow is designed to keep continuity visible and to
            preserve human review before outbound reaches inbox handoff.
          </p>
        </section>
        <section>
          <h2>Operating principle</h2>
          <p>
            AI can propose research summaries, draft language, and reply analysis.
            Agency operators still review, edit, and approve every client-facing
            decision. No autonomous sending is part of the current product model.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
