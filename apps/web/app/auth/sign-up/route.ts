import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createDefaultPostAuthRedirectPath } from "../../../lib/auth-redirects";
import { createOperationContext } from "../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../lib/server/request-security";
import {
  createRedirectUrl,
  createSupabaseServerClient,
} from "../../../lib/server/supabase";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

const signUpRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  passwordConfirmation: z.string().min(8),
}).refine((value) => value.password === value.passwordConfirmation, {
  message: "Passwords do not match.",
  path: ["passwordConfirmation"],
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_up.start",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);
  } catch (error) {
    operation.logger.warn("Sign-up route blocked untrusted request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/create-account?error=${encodeUserFacingError(error, "We could not verify that request. Refresh the page and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const formData = await request.formData();
  const parsed = signUpRequestSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(
      new URL(
        `/create-account?error=${encodeUserFacingError(parsed.error.issues[0]?.message ?? "invalid sign-up request", "Check the form and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    operation.logger.warn("Supabase auth is not configured for sign-up");
    return NextResponse.redirect(
      new URL(
        `/create-account?error=${encodeUserFacingError("supabase not configured")}`,
        request.url,
      ),
      303,
    );
  }

  const postAuthRedirectPath = createDefaultPostAuthRedirectPath({
    mode: "sign-up",
  });
  const callbackPath = `/auth/callback?mode=sign-up&next=${encodeURIComponent(postAuthRedirectPath)}`;
  const emailRedirectTo =
    createRedirectUrl(callbackPath) ??
    new URL(callbackPath, request.url).toString();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    options: {
      emailRedirectTo,
    },
  });

  if (error !== null) {
    operation.logger.error("Supabase sign-up start failed", {
      error: error.message,
      emailDomain: parsed.data.email.split("@")[1] ?? null,
    });
    return NextResponse.redirect(
      new URL(
        `/create-account?error=${encodeUserFacingError(error, "We could not create that account. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }

  operation.logger.info("Supabase sign-up confirmation email sent", {
    emailDomain: parsed.data.email.split("@")[1] ?? null,
    emailRedirectHost: new URL(emailRedirectTo).host,
  });

  return NextResponse.redirect(
    new URL(`/create-account?check-email=1`, request.url),
    303,
  );
}
