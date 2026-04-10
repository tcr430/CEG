import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { buildAuthCallbackBridgeHtml } from "../../../lib/auth-callback-bridge";
import { normalizePostAuthRedirectPath } from "../../../lib/auth-redirects";
import { createOperationContext } from "../../../lib/server/observability";
import { createSupabaseServerClient } from "../../../lib/server/supabase";
import { syncSupabaseUserToDatabase } from "../../../lib/server/user-sync";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_in.callback",
    requestId,
  });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const postAuthRedirectPath =
    normalizePostAuthRedirectPath(requestUrl.searchParams.get("next")) ??
    "/app?notice=Welcome%20back.";

  if (code === null) {
    operation.logger.warn("Auth callback reached without code; returning fragment bridge");
    return new NextResponse(buildAuthCallbackBridgeHtml(postAuthRedirectPath), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    operation.logger.warn("Supabase auth is not configured for callback");
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeUserFacingError("supabase not configured")}`, request.url),
      303,
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    operation.logger.error("Supabase code exchange failed", {
      error: error.message,
    });
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError(error, "We could not complete sign-in. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user !== null) {
    try {
      await syncSupabaseUserToDatabase({
        user,
        requestId: operation.requestId,
      });
    } catch (syncError) {
      operation.logger.error("Supabase user sync failed after code exchange", {
        error: syncError instanceof Error ? syncError.message : "Unknown error",
      });
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeUserFacingError(
            new Error("workspace sync failed"),
            "We signed you in, but could not prepare your workspace. Please try again.",
          )}`,
          request.url,
        ),
        303,
      );
    }
  }

  operation.logger.info("Supabase code exchange completed");
  return NextResponse.redirect(new URL(postAuthRedirectPath, request.url), 303);
}
