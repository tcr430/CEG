import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@ceg/auth";

import { getServerAuthContext } from "../../../../../lib/server/auth";
import { buildGmailConnectUrl } from "../../../../../lib/server/inbox/service";
import { createOperationContext } from "../../../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../../../lib/server/request-security";
import { encodeUserFacingError } from "../../../../../lib/server/user-facing-errors";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "inbox.gmail.connect.route",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);
  } catch (error) {
    operation.logger.warn("Blocked untrusted Gmail connect request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/app/settings?error=${encodeUserFacingError(error, "We could not verify that Gmail connection request. Please refresh and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const formData = await request.formData();
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string") {
    return NextResponse.redirect(
      new URL(
        `/app/settings?error=${encodeUserFacingError("workspace id is required", "Select a workspace and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const auth = await getServerAuthContext();
  if (auth.user === null) {
    return NextResponse.redirect(
      new URL("/sign-in?notice=Sign%20in%20to%20connect%20Gmail.", request.url),
      303,
    );
  }

  try {
    requireWorkspaceAccess(auth, workspaceId);
    const url = buildGmailConnectUrl({
      workspaceId,
      userId: auth.user.userId,
      requestId,
    });

    return NextResponse.redirect(url, 303);
  } catch (error) {
    operation.logger.error("Gmail connect route failed", {
      workspaceId,
      userId: auth.user.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${workspaceId}&error=${encodeUserFacingError(error, "We could not start the Gmail connection flow.")}`,
        request.url,
      ),
      303,
    );
  }
}

