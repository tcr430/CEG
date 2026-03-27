import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { createSenderProfileAction } from "../actions";
import { SenderProfileForm } from "../sender-profile-form";

type NewSenderProfilePageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function NewSenderProfilePage({
  searchParams,
}: NewSenderProfilePageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sender Profiles</p>
        <h1>Create a sender profile</h1>
        <p className="lede">
          Sender profiles shape message quality. Use a dedicated profile for SDR,
          founder, or agency positioning, or choose the basic mode fallback when
          sender-aware context is not available yet.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to profiles
        </Link>
      </div>

      <SenderProfileForm
        action={createSenderProfileAction}
        workspaceId={context.workspace.workspaceId}
        submitLabel="Create sender profile"
      />
    </main>
  );
}

