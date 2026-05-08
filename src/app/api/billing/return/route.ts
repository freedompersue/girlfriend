import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl, verifyCreemRedirectSignature } from "@/lib/creem";

function redirectToPricing(query: Record<string, string>) {
  const url = new URL("/pricing", getAppBaseUrl());

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const packId = req.nextUrl.searchParams.get("packId");
  const planId = req.nextUrl.searchParams.get("planId");

  const isValid = verifyCreemRedirectSignature({
    checkout_id: req.nextUrl.searchParams.get("checkout_id"),
    order_id: req.nextUrl.searchParams.get("order_id"),
    customer_id: req.nextUrl.searchParams.get("customer_id"),
    subscription_id: req.nextUrl.searchParams.get("subscription_id"),
    product_id: req.nextUrl.searchParams.get("product_id"),
    request_id: req.nextUrl.searchParams.get("request_id"),
    signature: req.nextUrl.searchParams.get("signature"),
  });

  if (!isValid) {
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
