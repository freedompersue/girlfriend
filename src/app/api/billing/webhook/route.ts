import { NextRequest, NextResponse } from "next/server";
import type { PlanType } from "@/lib/billing";
import {
  addCredits,
  findUserIdByCreemCustomerId,
  findUserIdByEmail,
  hasProcessedCreemCheckout,
  hasProcessedCreemTransaction,
  markCreemTransactionStatus,
  markSubscriptionTransactionsStatus,
  recordCreemSubscriptionPayment,
  upsertSubscriptionRecord,
} from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import {
  type CreemCheckoutCompletedObject,
  type CreemRefundObject,
  type CreemSubscriptionRef,
  type CreemWebhookEvent,
  getCreemMetadata,
  getCreemObjectId,
  getCreemProductIdForCreditPack,
  getCreemProductIdForPlan,
  parseCreemDate,
  verifyCreemWebhookSignature,
} from "@/lib/creem";

function inferPlanFromMetadata(
  metadata: Record<string, string>,
  productId: string | null
): PlanType {
  const candidate = metadata.planId;
  if (candidate === "plus" || candidate === "pro") return candidate;
  if (productId && productId === getCreemProductIdForPlan("plus")) return "plus";
  if (productId && productId === getCreemProductIdForPlan("pro")) return "pro";
  return "free";
}

async function resolveUserId(input: {
  metadata?: Record<string, string>;
  customerId?: string | null;
  customerEmail?: string | null;
}): Promise<string | null> {
  const metadataUserId = input.metadata?.userId;
  if (metadataUserId) return metadataUserId;

  if (input.customerId) {
    const byCustomerId = await findUserIdByCreemCustomerId(input.customerId);
    if (byCustomerId) return byCustomerId;
  }

  if (input.customerEmail) {
    return findUserIdByEmail(input.customerEmail);
  }

  return null;
}

async function syncSubscription(
  subscription: CreemSubscriptionRef,
  metadata: Record<string, string> = {}
): Promise<string | null> {
  const customerId = getCreemObjectId(subscription.customer);
  const productId = getCreemObjectId(subscription.product);
  const customerEmail =
    typeof subscription.customer === "string" ? null : subscription.customer?.email || null;
  const userId = await resolveUserId({
    metadata: {
      ...getCreemMetadata(subscription.metadata),
      ...metadata,
    },
    customerId,
    customerEmail,
  });

  if (!userId) return null;

  const plan = inferPlanFromMetadata(
    {
      ...getCreemMetadata(subscription.metadata),
      ...metadata,
    },
    productId
  );

  const status = subscription.status || "active";
  const currentPeriodEnd = parseCreemDate(subscription.current_period_end_date);

  await upsertSubscriptionRecord({
    userId,
    plan,
    status,
    creemCustomerId: customerId,
    creemSubscriptionId: subscription.id,
    creemProductId: productId,
    currentPeriodStart: parseCreemDate(subscription.current_period_start_date),
    currentPeriodEnd,
    cancelAtPeriodEnd:
      status === "canceled" ||
      status === "scheduled_cancel" ||
      status === "paused" ||
      Boolean(subscription.canceled_at),
  });

  return userId;
}

async function handleCheckoutCompleted(checkout: CreemCheckoutCompletedObject) {
  if (await hasProcessedCreemCheckout(checkout.id)) {
    return;
  }

  const metadata = getCreemMetadata(checkout.metadata);
  const customerId = checkout.customer?.id || null;
  const customerEmail = checkout.customer?.email || null;
  const userId = await resolveUserId({
    metadata,
    customerId,
    customerEmail,
  });

  if (!userId) {
    console.warn("Creem checkout.completed missing user mapping", checkout.id);
    return;
  }

  const orderId = checkout.order?.id || null;
  const productId = getCreemObjectId(checkout.product);

  if (checkout.subscription?.id) {
    await syncSubscription(checkout.subscription, metadata);
    return;
  }

  const packId = metadata.packId;
  const credits = Number.parseInt(metadata.credits || "0", 10);

  if (!packId || !credits) {
    console.warn("Creem checkout.completed missing credit metadata", checkout.id);
    return;
  }

  const expectedProductId = getCreemProductIdForCreditPack(packId);
  if (expectedProductId && productId && expectedProductId !== productId) {
    console.warn("Creem credit checkout product mismatch", {
      checkoutId: checkout.id,
      packId,
      productId,
      expectedProductId,
    });
  }

  await addCredits(userId, credits, `购买 ${credits} 积分`, {
    provider: "creem",
    creemCheckoutId: checkout.id,
    creemOrderId: orderId || undefined,
  });
}

async function handleSubscriptionPaid(subscription: CreemSubscriptionRef) {
  const userId = await syncSubscription(subscription);
  if (!userId) return;

  const transactionId = subscription.last_transaction_id;
  if (transactionId && (await hasProcessedCreemTransaction(transactionId))) {
    return;
  }

  const productId = getCreemObjectId(subscription.product);
  const plan = inferPlanFromMetadata(getCreemMetadata(subscription.metadata), productId);

  await recordCreemSubscriptionPayment({
    userId,
    plan,
    amount:
      typeof subscription.product === "string"
        ? 0
        : subscription.product?.price || 0,
    description: `续费 ${plan} 会员`,
    transactionId: transactionId || undefined,
    subscriptionId: subscription.id,
  });
}

async function handleSubscriptionStatus(
  subscription: CreemSubscriptionRef,
  status: string,
  cancelAtPeriodEnd: boolean
) {
  const userId = await syncSubscription({
    ...subscription,
    status,
  });

  if (!userId) return;

  await prisma.subscription.updateMany({
    where: { userId },
    data: {
      status,
      currentPeriodStart: parseCreemDate(subscription.current_period_start_date),
      currentPeriodEnd: parseCreemDate(subscription.current_period_end_date),
      cancelAtPeriodEnd,
    },
  });
}

async function handleRefundCreated(refund: CreemRefundObject) {
  if (refund.transaction?.id) {
    await markCreemTransactionStatus(refund.transaction.id, refund.status || "refunded");
  }

  if (refund.subscription?.id && refund.subscription.status === "canceled") {
    await prisma.subscription.updateMany({
      where: { creemSubscriptionId: refund.subscription.id },
      data: {
        status: "refunded",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(),
      },
    });

    await markSubscriptionTransactionsStatus(refund.subscription.id, "refunded");
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature");

  if (!verifyCreemWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CreemWebhookEvent;

  try {
    event = JSON.parse(rawBody) as CreemWebhookEvent;
  } catch (error) {
    console.error("Creem webhook parse error:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (event.eventType) {
      case "checkout.completed":
        await handleCheckoutCompleted(event.object as CreemCheckoutCompletedObject);
        break;
      case "subscription.active":
      case "subscription.update":
      case "subscription.trialing":
        await syncSubscription(event.object as CreemSubscriptionRef);
        break;
      case "subscription.paid":
        await handleSubscriptionPaid(event.object as CreemSubscriptionRef);
        break;
      case "subscription.scheduled_cancel":
        await handleSubscriptionStatus(event.object as CreemSubscriptionRef, "scheduled_cancel", true);
        break;
      case "subscription.canceled":
        await handleSubscriptionStatus(event.object as CreemSubscriptionRef, "canceled", true);
        break;
      case "subscription.past_due":
        await handleSubscriptionStatus(event.object as CreemSubscriptionRef, "past_due", false);
        break;
      case "subscription.expired":
        await handleSubscriptionStatus(event.object as CreemSubscriptionRef, "expired", false);
        break;
      case "subscription.paused":
        await handleSubscriptionStatus(event.object as CreemSubscriptionRef, "paused", true);
        break;
      case "refund.created":
        await handleRefundCreated(event.object as CreemRefundObject);
        break;
      case "dispute.created":
        console.warn("Creem dispute.created received", event.object);
        break;
      default:
        console.log("Unhandled Creem event type:", event.eventType);
    }
  } catch (error) {
    console.error("Creem webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
