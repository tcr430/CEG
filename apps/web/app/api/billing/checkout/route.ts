import { randomUUID } from "node:crypto";
import { requireWorkspaceAccess } from "@ceg/auth";
import { NextResponse } from "next/server";

import { getServerAuthContext } from "../../../../lib/server/auth";
import { createCheckoutSessionForWorkspace } from "../../../../lib/server/billing";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const formData = await request.formData();
  const workspaceId = formData.get("workspaceId");
  const planCode = formData.get("planCode");

  if (
    typeof workspaceId !== "string" ||
    (planCode !== "pro" && planCode !== "agency")
  ) {
    return NextResponse.redirect(
      new URL("/app/settings?billingError=invalid-request", request.url),
    );
  }

  const auth = await getServerAuthContext();
  if (auth.user === null) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  requireWorkspaceAccess(auth, workspaceId);

  try {
    const session = await createCheckoutSessionForWorkspace({
      workspaceId,
      planCode,
      userId: auth.user.userId,
      customerEmail: auth.user.email ?? null,
      requestId,
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${workspaceId}&billingError=${encodeURIComponent(
          error instanceof Error ? error.message : "checkout-failed",
        )}`,
        request.url,
      ),
      303,
    );
  }
}
