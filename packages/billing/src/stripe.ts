import Stripe from "stripe";

import { billingPlanCodes, type BillingPlanCode } from "./plans.js";

const supportedWebhookEvents = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

export type BillingLogger = {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
};

export type StripeBillingConfig = {
  secretKey: string;
  webhookSecret: string;
  appUrl: string;
  monthlyPriceIds: {
    pro: string;
    agency: string;
  };
};

export type CreateCheckoutSessionInput = {
  workspaceId: string;
  userId?: string | null;
  customerEmail?: string | null;
  existingCustomerId?: string | null;
  planCode: Exclude<BillingPlanCode, "free">;
  successUrl: string;
  cancelUrl: string;
};

export type CreateBillingPortalSessionInput = {
  customerId: string;
  returnUrl: string;
};

export type NormalizedSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type NormalizedBillingSubscription = {
  workspaceId: string;
  provider: "stripe";
  providerCustomerId: string;
  providerSubscriptionId: string;
  planCode: BillingPlanCode;
  status: NormalizedSubscriptionStatus;
  seats: number;
  billingEmail: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, unknown>;
};

export type StripeBillingProvider = {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ id: string; url: string }>;
  createBillingPortalSession(input: CreateBillingPortalSessionInput): Promise<{ url: string }>;
  verifyWebhook(payload: string, signature: string): Stripe.Event;
  normalizeSubscriptionFromEvent(event: Stripe.Event): Promise<NormalizedBillingSubscription | null>;
  listSupportedWebhookEvents(): readonly string[];
};

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey);
}

function toPlanCode(value: string | undefined, fallback: BillingPlanCode = "free"): BillingPlanCode {
  return billingPlanCodes.includes(value as BillingPlanCode)
    ? (value as BillingPlanCode)
    : fallback;
}

function toSubscriptionStatus(status: Stripe.Subscription.Status): NormalizedSubscriptionStatus {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "incomplete":
      return status;
    default:
      return "incomplete";
  }
}

function toDate(value?: number | null): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function readWorkspaceId(metadata: Record<string, string> | null | undefined): string | null {
  const value = metadata?.workspaceId;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readPlanCodeFromPriceId(
  priceId: string | null | undefined,
  monthlyPriceIds: StripeBillingConfig["monthlyPriceIds"],
): BillingPlanCode {
  if (priceId === monthlyPriceIds.pro) {
    return "pro";
  }

  if (priceId === monthlyPriceIds.agency) {
    return "agency";
  }

  return "free";
}

function normalizeSubscription(
  subscription: Stripe.Subscription,
  monthlyPriceIds: StripeBillingConfig["monthlyPriceIds"],
): NormalizedBillingSubscription | null {
  const subscriptionRecord = subscription as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const metadata = subscription.metadata ?? {};
  const workspaceId = readWorkspaceId(metadata);
  const primaryItem = subscription.items.data[0];
  const providerCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const planCode = toPlanCode(
    metadata.planCode,
    readPlanCodeFromPriceId(primaryItem?.price.id, monthlyPriceIds),
  );

  if (
    workspaceId === null ||
    providerCustomerId === null ||
    typeof subscription.id !== "string"
  ) {
    return null;
  }

  return {
    workspaceId,
    provider: "stripe",
    providerCustomerId,
    providerSubscriptionId: subscription.id,
    planCode,
    status: toSubscriptionStatus(subscription.status),
    seats: primaryItem?.quantity ?? 1,
    billingEmail:
      typeof subscription.customer !== "string" && subscription.customer && !subscription.customer.deleted
        ? subscription.customer.email ?? null
        : null,
    currentPeriodStart: toDate(subscriptionRecord.current_period_start),
    currentPeriodEnd: toDate(subscriptionRecord.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    metadata: {
      ...metadata,
      stripePriceId: primaryItem?.price.id ?? null,
      stripeCustomerId: providerCustomerId,
      stripeSubscriptionId: subscription.id,
    },
  };
}

export function createStripeBillingProvider(
  config: StripeBillingConfig,
  options: {
    client?: Stripe;
    logger?: BillingLogger;
  } = {},
): StripeBillingProvider {
  const client = options.client ?? createStripeClient(config.secretKey);
  const logger = options.logger;

  return {
    async createCheckoutSession(input) {
      const priceId = config.monthlyPriceIds[input.planCode];
      const session = await client.checkout.sessions.create({
        mode: "subscription",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer: input.existingCustomerId ?? undefined,
        customer_email: input.existingCustomerId ? undefined : input.customerEmail ?? undefined,
        client_reference_id: input.workspaceId,
        metadata: {
          workspaceId: input.workspaceId,
          userId: input.userId ?? "",
          planCode: input.planCode,
        },
        subscription_data: {
          metadata: {
            workspaceId: input.workspaceId,
            userId: input.userId ?? "",
            planCode: input.planCode,
          },
        },
      });

      if (!session.url) {
        throw new Error("Stripe checkout session did not return a redirect URL.");
      }

      return {
        id: session.id,
        url: session.url,
      };
    },
    async createBillingPortalSession(input) {
      const session = await client.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });

      return {
        url: session.url,
      };
    },
    verifyWebhook(payload, signature) {
      return client.webhooks.constructEvent(payload, signature, config.webhookSecret);
    },
    async normalizeSubscriptionFromEvent(event) {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.mode !== "subscription" ||
          typeof session.subscription !== "string"
        ) {
          return null;
        }

        const subscription = await client.subscriptions.retrieve(session.subscription, {
          expand: ["customer", "items.data.price"],
        });
        const normalized = normalizeSubscription(subscription, config.monthlyPriceIds);
        logger?.info("Stripe checkout session normalized", {
          eventType: event.type,
          workspaceId: normalized?.workspaceId ?? null,
          subscriptionId: normalized?.providerSubscriptionId ?? null,
        });
        return normalized;
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const subscription = event.data.object as Stripe.Subscription;
        const normalized = normalizeSubscription(subscription, config.monthlyPriceIds);
        logger?.info("Stripe subscription event normalized", {
          eventType: event.type,
          workspaceId: normalized?.workspaceId ?? null,
          subscriptionId: normalized?.providerSubscriptionId ?? null,
        });
        return normalized;
      }

      return null;
    },
    listSupportedWebhookEvents() {
      return [...supportedWebhookEvents];
    },
  };
}
