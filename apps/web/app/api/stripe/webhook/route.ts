import { NextResponse } from "next/server";

import { handleStripeWebhook } from "../../../../lib/server/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const result = await handleStripeWebhook({ payload, signature });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook handling failed.",
      },
      { status: 400 },
    );
  }
}
