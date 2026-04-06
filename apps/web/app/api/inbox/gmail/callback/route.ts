import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerAuthContext } from "../../../../../lib/server/auth";
import {
  assertWorkspaceInboxAccess,
  handleGmailOAuthCallback,
  readGmailOAuthState,
} from "../../../../../lib/server/inbox/service";
import { createOperationContext } from "../../../../../lib/server/observability";
import { encodeUserFacingError } from "../../../../../lib/server/user-facing-errors";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "inbox.gmail.callback.route",
    requestId,
  });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const stateToken = requestUrl.searchParams.get("state");
  const providerError = requestUrl.searchParams.get("error");

  let workspaceId: string | null = null;

  try {
    if (stateToken) {
      const state = readGmailOAuthState(stateToken);
      workspaceId = state.workspaceId;
    }
  } catch {
    workspaceId = null;
  }

  if (providerError) {
    return NextResponse.redirect(
      new URL(
        `/app/settings${workspaceId ? `?workspace=${workspaceId}&` : "?"}error=${encodeUserFacingError(providerError, "The Gmail connection was canceled or failed.")}`,
        request.url,
      ),
      303,
    );
  }

  if (!code || !stateToken) {
    return NextResponse.redirect(
      new URL(
        `/app/settings${workspaceId ? `?workspace=${workspaceId}&` : "?"}error=${encodeUserFacingError("gmail callback missing code", "We could not complete the Gmail connection. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const auth = await getServerAuthContext();
  if (auth.user === null) {
    return NextResponse.redirect(
      new URL("/sign-in?notice=Sign%20in%20to%20finish%20connecting%20Gmail.", request.url),
      303,
    );
  }

  try {
    const state = readGmailOAuthState(stateToken);
    workspaceId = state.workspaceId;

    if (state.userId !== auth.user.userId) {
      throw new Error("Auth session missing or mismatched for Gmail callback.");
    }

    await assertWorkspaceInboxAccess({
      auth,
      workspaceId: state.workspaceId,
    });

    const result = await handleGmailOAuthCallback({
      workspaceId: state.workspaceId,
      userId: auth.user.userId,
      code,
      requestId: state.requestId ?? requestId,
    });

    return NextResponse.redirect(
      new URL(
        `/app/settings?workspace=${state.workspaceId}&success=${encodeURIComponent(`Connected Gmail for ${result.emailAddress}.`)}`,
        request.url,
      ),
      303,
    );
  } catch (error) {
    operation.logger.error("Gmail callback route failed", {
      workspaceId,
      userId: auth.user.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/app/settings${workspaceId ? `?workspace=${workspaceId}&` : "?"}error=${encodeUserFacingError(error, "We could not finish connecting Gmail.")}`,
        request.url,
      ),
      303,
    );
  }
}

