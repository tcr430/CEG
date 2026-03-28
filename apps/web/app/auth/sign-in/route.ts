import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createOperationContext } from "../../../lib/server/observability";
import {
  createRedirectUrl,
  createSupabaseServerClient,
} from "../../../lib/server/supabase";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_in.start",
    requestId,
  });
  const formData = await request.formData();
  const email = formData.get("email");

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeUserFacingError("missing email")}`, request.url),
      303,
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    operation.logger.warn("Supabase auth is not configured for sign-in", {
      emailDomain: normalizedEmail.split("@")[1] ?? null,
    });
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError("supabase not configured")}`,
        request.url,
      ),
      303,
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: createRedirectUrl("/auth/callback"),
    },
  });

  if (error !== null) {
    operation.logger.error("Supabase sign-in start failed", {
      error: error.message,
      emailDomain: normalizedEmail.split("@")[1] ?? null,
    });
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError(error, "We could not start sign-in. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }

  operation.logger.info("Supabase sign-in started", {
    emailDomain: normalizedEmail.split("@")[1] ?? null,
  });
  return NextResponse.redirect(new URL("/sign-in?check-email=1", request.url), 303);
}
