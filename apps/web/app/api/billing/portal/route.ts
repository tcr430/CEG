import { requireWorkspaceAccess } from "@ceg/auth";
import { NextResponse } from "next/server";

import { getServerAuthContext } from "../../../../lib/server/auth";
import { createBillingPortalSessionForWorkspace } from "../../../../lib/server/billing";

export async function POST(request: Request) {
  const formData = await request.formData();
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return NextResponse.redirect(
      new URL("/app/settings?billingError=missing-workspace", request.url),
      303,
    );
  }

  const auth = await getServerAuthContext();
  if (auth.user === null) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  requireWorkspaceAccess(auth, workspaceId);

  try {
    const session = await createBillingPortalSessionForWorkspace({ workspaceId });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${workspaceId}&billingError=${encodeURIComponent(
          error instanceof Error ? error.message : "portal-failed",
        )}`,
        request.url,
      ),
      303,
    );
  }
}
