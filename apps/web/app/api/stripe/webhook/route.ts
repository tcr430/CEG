import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { handleStripeWebhook } from "../../../../lib/server/billing";
import { createOperationContext } from "../../../../lib/server/observability";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const operation = createOperationContext({
    operation: "billing.webhook.route",
    requestId,
  });
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    operation.logger.warn("Stripe webhook missing signature");
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const result = await handleStripeWebhook({ payload, signature, requestId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    operation.logger.error("Stripe webhook handling failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        error: "Webhook verification or sync failed.",
      },
      { status: 400 },
    );
  }
}
