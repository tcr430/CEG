import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createDefaultPostAuthRedirectPath,
  normalizeAuthMode,
  normalizePostAuthRedirectPath,
} from "../../../lib/auth-redirects";
import { createOperationContext } from "../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../lib/server/request-security";
import {
  createRedirectUrl,
  createSupabaseServerClient,
} from "../../../lib/server/supabase";
import { getSupabaseProductAccount } from "../../../lib/server/user-sync";
import { encodeUserFacingError } from "../../../lib/server/user-facing-errors";

const signInRequestSchema = z.object({
  email: z.string().trim().email(),
  mode: z.enum(["password-sign-in", "magic-link"]).default("password-sign-in"),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.sign_in.start",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);
  } catch (error) {
    operation.logger.warn("Sign-in route blocked untrusted request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError(error, "We could not verify that request. Refresh the page and try again.")}`,
        request.url,
      ),
      303,
    );
  }

  const formData = await request.formData();
  const mode = normalizeAuthMode(formData.get("mode"));
  const next = formData.get("next");
  const password = formData.get("password");
  const parsed = signInRequestSchema.safeParse({
    email: formData.get("email"),
    mode: mode === "sign-up" ? "password-sign-in" : mode,
    password: typeof password === "string" ? password : undefined,
  });
  const postAuthRedirectPath =
    (typeof next === "string" ? normalizePostAuthRedirectPath(next) : null) ??
    createDefaultPostAuthRedirectPath({
      mode: parsed.success ? parsed.data.mode : "password-sign-in",
    });

  if (!parsed.success) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeUserFacingError("missing email")}`, request.url),
      303,
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
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

  if (parsed.data.mode === "password-sign-in") {
    if (!parsed.data.password || parsed.data.password.trim() === "") {
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeUserFacingError("missing password", "Enter your password to sign in.")}`,
          request.url,
        ),
        303,
      );
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: parsed.data.password,
    });

    if (error !== null) {
      operation.logger.error("Supabase password sign-in failed", {
        error: error.message,
        emailDomain: normalizedEmail.split("@")[1] ?? null,
      });
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeUserFacingError(error, "We could not sign you in. Check your email and password.")}`,
          request.url,
        ),
        303,
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const productAccount =
      user === null
        ? null
        : await getSupabaseProductAccount({
            user,
            requestId,
          });

    if (productAccount === null) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(
          `/create-account?notice=${encodeURIComponent("Create and confirm an OutFlow account before signing in.")}`,
          request.url,
        ),
        303,
      );
    }

    operation.logger.info("Supabase password sign-in completed", {
      emailDomain: normalizedEmail.split("@")[1] ?? null,
    });
    return NextResponse.redirect(new URL(postAuthRedirectPath, request.url), 303);
  }

  const callbackPath = `/auth/callback?mode=magic-link&next=${encodeURIComponent(postAuthRedirectPath)}`;
  const emailRedirectTo =
    createRedirectUrl(callbackPath) ??
    new URL(callbackPath, request.url).toString();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (error !== null) {
    operation.logger.error("Supabase magic-link sign-in start failed", {
      error: error.message,
      emailDomain: normalizedEmail.split("@")[1] ?? null,
    });
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeUserFacingError(error, "We could not send a magic link. Please try again.")}`,
        request.url,
      ),
      303,
    );
  }

  operation.logger.info("Supabase magic-link sign-in started", {
    emailDomain: normalizedEmail.split("@")[1] ?? null,
    emailRedirectHost: new URL(emailRedirectTo).host,
  });
  return NextResponse.redirect(new URL("/sign-in?check-email=1", request.url), 303);
}
