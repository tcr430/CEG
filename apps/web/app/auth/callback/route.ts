import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createOperationContext } from "../../../lib/server/observability";
import { createSupabaseServerClient } from "../../../lib/server/supabase";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_in.callback",
    requestId,
  });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code === null) {
    operation.logger.warn("Auth callback reached without code");
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError("auth callback missing code", "We could not complete sign-in. Please try again.")}`,
        request.url,
      ),
      303,
    );
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

  operation.logger.info("Supabase code exchange completed");
  return NextResponse.redirect(new URL("/app?notice=Welcome%20back.", request.url), 303);
}
