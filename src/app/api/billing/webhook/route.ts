import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addCredits } from "@/lib/billing";
import type Stripe from "stripe";

function getSubPeriod(sub: Record<string, unknown>): { start: Date; end: Date } {
  const start = (sub.current_period_start as number) || Math.floor(Date.now() / 1000);
  const end = (sub.current_period_end as number) || Math.floor(Date.now() / 1000) + 30 * 86400;
  return { start: new Date(start * 1000), end: new Date(end * 1000) };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === "subscription") {
          const planId = session.metadata?.planId || "plus";
          const subscriptionId = session.subscription as string;

          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          const subRaw = stripeSub as unknown as Record<string, unknown>;
          const period = getSubPeriod(subRaw);

          await prisma.subscription.upsert({
            where: { userId },
            update: {
              plan: planId,
              status: "active",
              stripeSubscriptionId: subscriptionId,
              stripePriceId: stripeSub.items.data[0]?.price?.id,
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
              cancelAtPeriodEnd: false,
            },
            create: {
              userId,
              plan: planId,
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: stripeSub.items.data[0]?.price?.id,
              currentPeriodStart: period.start,
              currentPeriodEnd: period.end,
            },
          });

          await prisma.transaction.create({
            data: {
              userId,
              type: "subscription",
              amount: session.amount_total || 0,
              description: `订阅 ${planId} 会员`,
              stripePaymentId: session.payment_intent as string,
            },
          });
        }

        if (session.mode === "payment") {
          const credits = parseInt(session.metadata?.credits || "0");
          if (credits > 0) {
            await addCredits(userId, credits, `购买 ${credits} 积分`, session.payment_intent as string);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const subRaw = sub as unknown as Record<string, unknown>;
        const customerId = sub.customer as string;
        const period = getSubPeriod(subRaw);

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: sub.status === "active" ? "active" : sub.status,
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: "free", status: "canceled", stripeSubscriptionId: null },
        });
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
  }

  return NextResponse.json({ received: true });
}
