import { NextResponse } from "next/server";

import {
  createRedirectUrl,
  createSupabaseServerClient,
} from "../../../lib/server/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get("email");

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.redirect(
      new URL("/sign-in?error=missing-email", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    return NextResponse.redirect(
      new URL("/sign-in?error=supabase-not-configured", request.url),
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: createRedirectUrl("/auth/callback"),
    },
  });

  if (error !== null) {
    return NextResponse.redirect(
      new URL("/sign-in?error=sign-in-failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/sign-in?check-email=1", request.url));
}
