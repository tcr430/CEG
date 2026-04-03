import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createOperationContext } from "../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../lib/server/request-security";
import { createSupabaseServerClient } from "../../../lib/server/supabase";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_out",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);
  } catch (error) {
    operation.logger.warn("Sign-out route blocked untrusted request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeUserFacingError(error, "We could not verify that request. Refresh the page and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    await supabase?.auth.signOut();
    operation.logger.info("User signed out");
    return NextResponse.redirect(new URL("/?notice=Signed%20out.", request.url), 303);
  } catch (error) {
    operation.logger.error("Sign-out failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/?error=${encodeUserFacingError(error, "We could not sign you out cleanly. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }
}
