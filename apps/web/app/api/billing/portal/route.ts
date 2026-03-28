import { randomUUID } from "node:crypto";
import { requireWorkspaceAccess } from "@ceg/auth";
import { NextResponse } from "next/server";

import { getServerAuthContext } from "../../../../lib/server/auth";
import { createBillingPortalSessionForWorkspace } from "../../../../lib/server/billing";
import { createOperationContext } from "../../../../lib/server/observability";
import { encodeUserFacingError } from "../../../../lib/server/user-facing-errors";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "billing.portal.route",
    requestId,
  });
  const formData = await request.formData();
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return NextResponse.redirect(
      new URL(
        `/app/settings?billingError=${encodeUserFacingError("missing workspace", "Select a workspace and try again.")}`,
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
    const session = await createBillingPortalSessionForWorkspace({
      workspaceId,
      userId: auth.user.userId,
      requestId,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    operation.logger.error("Billing portal route failed", {
      workspaceId,
      userId: auth.user.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${workspaceId}&billingError=${encodeUserFacingError(error, "We could not open billing management. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }
}
