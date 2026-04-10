import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createOperationContext } from "../../../lib/server/observability";
import { assertTrustedAppRequest } from "../../../lib/server/request-security";
import { createSupabaseServerClient } from "../../../lib/server/supabase";
import { getSupabaseProductAccount } from "../../../lib/server/user-sync";

const authSessionRequestSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "auth.session.persist",
    requestId,
  });

  try {
    assertTrustedAppRequest(request);
  } catch (error) {
    operation.logger.warn("Auth session route blocked untrusted request", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  const parsedBody = authSessionRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    operation.logger.warn("Auth session route received invalid payload");
    return NextResponse.json({ error: "Invalid session payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    operation.logger.warn("Supabase auth is not configured for session persistence");
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const { error } = await supabase.auth.setSession({
    access_token: parsedBody.data.accessToken,
    refresh_token: parsedBody.data.refreshToken,
  });

  if (error !== null) {
    operation.logger.error("Supabase session persistence failed", {
      error: error.message,
    });
    return NextResponse.json({ error: "Session could not be saved." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError !== null || user === null) {
    operation.logger.error("Supabase session persisted without a valid user", {
      error: userError?.message ?? "Missing user",
    });
    return NextResponse.json({ error: "Session user could not be verified." }, { status: 401 });
  }

  try {
    const productAccount = await getSupabaseProductAccount({
      user,
      requestId: operation.requestId,
    });

    if (productAccount === null) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Create and confirm an OutFlow account before signing in." },
        { status: 403 },
      );
    }
  } catch (syncError) {
    operation.logger.error("Product account lookup failed after fragment session persistence", {
      error: syncError instanceof Error ? syncError.message : "Unknown error",
    });
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Workspace could not be prepared." },
      { status: 500 },
    );
  }

  operation.logger.info("Supabase session persisted from callback fragment");
  return NextResponse.json({ ok: true });
}
