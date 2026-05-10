import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  addCredits,
  findUserIdByCreemCustomerId,
  findUserIdByEmail,
  hasProcessedCreemCheckout,
  upsertSubscriptionRecord,
} from "@/lib/billing";
import {
  getAppBaseUrl,
  getCreemCheckout,
  getCreemMetadata,
  getCreemObjectId,
  getCreemProductIdForPlan,
  getCreemSubscription,
  parseCreemDate,
  verifyCreemRedirectSignature,
} from "@/lib/creem";

function redirectToPricing(query: Record<string, string>) {
  const url = new URL("/pricing", getAppBaseUrl());

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

function inferPlanFromReturn(
  explicitPlanId: string | null,
  productId: string | null
): "plus" | "pro" | null {
  if (explicitPlanId === "plus" || explicitPlanId === "pro") return explicitPlanId;
  if (productId === getCreemProductIdForPlan("plus")) return "plus";
  if (productId === getCreemProductIdForPlan("pro")) return "pro";
  return null;
}

async function resolveUserId(input: {
  metadata?: Record<string, string>;
  customerId?: string | null;
  customerEmail?: string | null;
  fallbackUserId?: string | null;
}): Promise<string | null> {
  const metaUserId = input.metadata?.userId;
  if (metaUserId) return metaUserId;
  if (input.customerId) {
    const id = await findUserIdByCreemCustomerId(input.customerId);
    if (id) return id;
  }
  if (input.customerEmail) {
    const id = await findUserIdByEmail(input.customerEmail);
    if (id) return id;
  }
  return input.fallbackUserId || null;
}

async function syncSuccessfulReturn(req: NextRequest, input: {
  type: string | null;
  planId: string | null;
  packId: string | null;
  checkoutId: string | null;
  subscriptionId: string | null;
}) {
  // Best-effort current user — used only as a fallback when checkout
  // metadata / customer mapping is missing. Do NOT require it.
  const sessionUser = await getCurrentUser(req).catch(() => null);
  const fallbackUserId = sessionUser?.id || null;

  try {
    if (input.checkoutId) {
      const checkout = await getCreemCheckout(input.checkoutId);
      const metadata = getCreemMetadata(checkout.metadata);

      // Authoritative success check from Creem API.
      if (checkout.status !== "completed" && checkout.order?.status !== "paid") {
        return false;
      }

      const customerId = checkout.customer?.id || null;
      const customerEmail = checkout.customer?.email || null;
      const userId = await resolveUserId({
        metadata,
        customerId,
        customerEmail,
        fallbackUserId,
      });

      if (!userId) return false;

      // Sanity: if metadata explicitly binds to a different user, refuse.
      if (metadata.userId && metadata.userId !== userId) {
        return false;
      }

      if (input.type === "subscription" && checkout.subscription?.id) {
        const productId =
          getCreemObjectId(checkout.subscription.product) || getCreemObjectId(checkout.product);
        const plan = inferPlanFromReturn(input.planId, productId);

        if (!plan) return false;

        const subscription =
          typeof checkout.subscription === "string"
            ? await getCreemSubscription(checkout.subscription)
            : checkout.subscription;

        await upsertSubscriptionRecord({
          userId,
          plan,
          status: subscription.status || "active",
          creemCustomerId:
            customerId ||
            (typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id) ||
            undefined,
          creemSubscriptionId: subscription.id,
          creemProductId: productId,
          currentPeriodStart: parseCreemDate(subscription.current_period_start_date),
          currentPeriodEnd: parseCreemDate(subscription.current_period_end_date),
          cancelAtPeriodEnd:
            subscription.status === "canceled" ||
            subscription.status === "scheduled_cancel" ||
            subscription.status === "paused" ||
            Boolean(subscription.canceled_at),
        });

        return true;
      }

      if (input.type === "credits" || metadata.type === "credits") {
        const credits = Number.parseInt(metadata.credits || "0", 10);
        if (credits > 0 && !(await hasProcessedCreemCheckout(checkout.id))) {
          await addCredits(userId, credits, `购买 ${credits} 积分`, {
            provider: "creem",
            creemCheckoutId: checkout.id,
            creemOrderId: checkout.order?.id || undefined,
          });
        }
        return credits > 0;
      }
    }

    if (input.type === "subscription" && input.subscriptionId) {
      const subscription = await getCreemSubscription(input.subscriptionId);
      const productId = getCreemObjectId(subscription.product);
      const plan = inferPlanFromReturn(input.planId, productId);

      if (!plan) return false;

      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || null;
      const customerEmail =
        typeof subscription.customer === "string"
          ? null
          : subscription.customer?.email || null;
      const userId = await resolveUserId({
        metadata: getCreemMetadata(subscription.metadata),
        customerId,
        customerEmail,
        fallbackUserId,
      });

      if (!userId) return false;

      await upsertSubscriptionRecord({
        userId,
        plan,
        status: subscription.status || "active",
        creemCustomerId: customerId || undefined,
        creemSubscriptionId: subscription.id,
        creemProductId: productId,
        currentPeriodStart: parseCreemDate(subscription.current_period_start_date),
        currentPeriodEnd: parseCreemDate(subscription.current_period_end_date),
        cancelAtPeriodEnd:
          subscription.status === "canceled" ||
          subscription.status === "scheduled_cancel" ||
          subscription.status === "paused" ||
          Boolean(subscription.canceled_at),
      });

      return true;
    }
  } catch (error) {
    console.error("Creem return sync failed:", error);
  }

  return false;
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const packId = req.nextUrl.searchParams.get("packId");
  const planId = req.nextUrl.searchParams.get("planId");
  const checkoutId = req.nextUrl.searchParams.get("checkout_id");
  const subscriptionId = req.nextUrl.searchParams.get("subscription_id");

  const isValid = verifyCreemRedirectSignature({
    checkout_id: checkoutId,
    order_id: req.nextUrl.searchParams.get("order_id"),
    customer_id: req.nextUrl.searchParams.get("customer_id"),
    subscription_id: subscriptionId,
    product_id: req.nextUrl.searchParams.get("product_id"),
    request_id: req.nextUrl.searchParams.get("request_id"),
    signature: req.nextUrl.searchParams.get("signature"),
  });

  const synced = await syncSuccessfulReturn(req, {
    type,
    planId,
    packId,
    checkoutId,
    subscriptionId,
  });

  if (!isValid && !synced) {
    return redirectToPricing({ canceled: "true" });
  }

  if (type === "credits" && packId) {
    return redirectToPricing({
      credits_success: "true",
      pack: packId,
    });
  }

  if (type === "subscription" && planId) {
    return redirectToPricing({
      success: "true",
      plan: planId,
    });
  }

  return redirectToPricing({ success: "true" });
}
