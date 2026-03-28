import { randomUUID } from "node:crypto";
import { requireWorkspaceAccess } from "@ceg/auth";
import { NextResponse } from "next/server";

import { getServerAuthContext } from "../../../../lib/server/auth";
import { createCheckoutSessionForWorkspace } from "../../../../lib/server/billing";
import { createOperationContext } from "../../../../lib/server/observability";
import { encodeUserFacingError } from "../../../../lib/server/user-facing-errors";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "billing.checkout.route",
    requestId,
  });
  const formData = await request.formData();
  const workspaceId = formData.get("workspaceId");
  const planCode = formData.get("planCode");

  if (
    typeof workspaceId !== "string" ||
    (planCode !== "pro" && planCode !== "agency")
  ) {
    return NextResponse.redirect(
      new URL(
        `/app/settings?billingError=${encodeUserFacingError("invalid billing request", "That billing request was incomplete.")}`,
        request.url,
      ),
      303,
    );
  }

  const auth = await getServerAuthContext();
  if (auth.user === null) {
    return NextResponse.redirect(new URL("/sign-in?notice=Sign%20in%20to%20continue.", request.url), 303);
  }

  try {
    requireWorkspaceAccess(auth, workspaceId);
    const session = await createCheckoutSessionForWorkspace({
      workspaceId,
      planCode,
      userId: auth.user.userId,
      customerEmail: auth.user.email ?? null,
      requestId,
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    operation.logger.error("Billing checkout route failed", {
      workspaceId,
      planCode,
      userId: auth.user.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${workspaceId}&billingError=${encodeUserFacingError(error, "We could not start checkout. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }
}
