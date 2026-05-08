import "server-only";

import crypto from "node:crypto";
import type { PlanType } from "./billing-plans";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface CreemCheckoutResponse {
  id: string;
  mode: string;
  object: "checkout";
  status: string;
  checkout_url: string;
  product: string;
  units?: number;
  request_id?: string | null;
  success_url?: string | null;
  metadata?: Record<string, JsonValue>;
}

export interface CreemCustomerPortalResponse {
  customer_portal_link: string;
}

export interface CreemCustomerRef {
  id: string;
  email?: string | null;
  name?: string | null;
  country?: string | null;
}

export interface CreemProductRef {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  billing_type?: string | null;
  billing_period?: string | null;
  status?: string | null;
}

export interface CreemSubscriptionRef {
  id: string;
  object?: "subscription";
  status?: string | null;
  collection_method?: string | null;
  product?: CreemProductRef | string | null;
  customer?: CreemCustomerRef | string | null;
  last_transaction_id?: string | null;
  last_transaction_date?: string | null;
  next_transaction_date?: string | null;
  current_period_start_date?: string | null;
  current_period_end_date?: string | null;
  canceled_at?: string | null;
  metadata?: Record<string, JsonValue> | null;
  items?: Array<{ id: string; product_id?: string | null; units?: number | null }> | null;
}

export interface CreemCheckoutCompletedObject {
  id: string;
  object: "checkout";
  request_id?: string | null;
  status: string;
  mode?: string | null;
  order?: {
    id: string;
    customer?: string | null;
    product?: string | null;
    amount?: number | null;
    currency?: string | null;
    status?: string | null;
    type?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  product?: CreemProductRef | string | null;
  customer?: CreemCustomerRef | null;
  subscription?: CreemSubscriptionRef | null;
  custom_fields?: JsonValue[] | null;
  metadata?: Record<string, JsonValue> | null;
}

export interface CreemRefundObject {
  id: string;
  object: "refund";
  status?: string | null;
  refund_amount?: number | null;
  refund_currency?: string | null;
  reason?: string | null;
  created_at?: string | null;
  transaction?: {
    id: string;
    amount?: number | null;
    amount_paid?: number | null;
    status?: string | null;
  } | null;
  subscription?: {
    id: string;
    status?: string | null;
  } | null;
  customer?: CreemCustomerRef | null;
}

export type CreemWebhookEventType =
  | "checkout.completed"
  | "subscription.active"
  | "subscription.paid"
  | "subscription.canceled"
  | "subscription.scheduled_cancel"
  | "subscription.past_due"
  | "subscription.expired"
  | "subscription.trialing"
  | "subscription.paused"
  | "subscription.update"
  | "refund.created"
  | "dispute.created";

export interface CreemWebhookEvent<T = unknown> {
  id: string;
  eventType: CreemWebhookEventType | string;
  created_at: number;
  object: T;
}

export interface CreemRedirectParams {
  checkout_id?: string | null;
  order_id?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  product_id?: string | null;
  request_id?: string | null;
  signature?: string | null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getCreemApiKey(): string {
  return getRequiredEnv("CREEM_API_KEY");
}

export function getCreemBaseUrl(): string {
  const explicit = process.env.CREEM_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  return getCreemApiKey().startsWith("creem_test_")
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

export function getAppBaseUrl(): string {
  return (
    process.env.AUTH_CANONICAL_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

type CreemRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: Record<string, JsonValue | undefined> | undefined;
  headers?: HeadersInit;
};

export async function creemRequest<T>(
  path: string,
  { body, headers, ...init }: CreemRequestOptions = {}
): Promise<T> {
  const response = await fetch(`${getCreemBaseUrl()}/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "x-api-key": getCreemApiKey(),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Creem request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function createCreemCheckout(payload: {
  productId: string;
  requestId?: string;
  successUrl?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  units?: number;
  metadata?: Record<string, JsonValue>;
}) {
  const customer =
    payload.customerId || payload.customerEmail || payload.customerName
      ? {
          ...(payload.customerId ? { id: payload.customerId } : {}),
          ...(payload.customerEmail ? { email: payload.customerEmail } : {}),
          ...(payload.customerName ? { name: payload.customerName } : {}),
        }
      : undefined;

  return creemRequest<CreemCheckoutResponse>("/checkouts", {
    method: "POST",
    body: {
      product_id: payload.productId,
      request_id: payload.requestId,
      success_url: payload.successUrl,
      units: payload.units,
      customer,
      metadata: payload.metadata,
    },
  });
}

export async function getCreemCustomerPortalLink(customerId: string) {
  return creemRequest<CreemCustomerPortalResponse>("/customers/billing", {
    method: "POST",
    body: {
      customer_id: customerId,
    },
  });
}

export function verifyCreemWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;

  const secret = process.env.CREEM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export function verifyCreemRedirectSignature(params: CreemRedirectParams): boolean {
  const signature = params.signature?.trim();
  if (!signature) return false;

  const apiKey = process.env.CREEM_API_KEY?.trim();
  if (!apiKey) return false;

  const sortedParams = Object.entries({
    checkout_id: params.checkout_id,
    order_id: params.order_id,
    customer_id: params.customer_id,
    subscription_id: params.subscription_id,
    product_id: params.product_id,
    request_id: params.request_id,
  })
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const expected = crypto
    .createHmac("sha256", apiKey)
    .update(sortedParams)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export function getCreemProductIdForPlan(planId: Exclude<PlanType, "free">): string | null {
  const productId =
    (planId === "plus" ? process.env.CREEM_PLUS_PRODUCT_ID : process.env.CREEM_PRO_PRODUCT_ID)?.trim() ||
    (planId === "plus" ? process.env.CREEM_PRODUCT_ID?.trim() : undefined);

  return productId || null;
}

export function getCreemProductIdForCreditPack(packId: string): string | null {
  const mapping: Record<string, string | undefined> = {
    pack_50: process.env.CREEM_CREDITS_50_PRODUCT_ID,
    pack_200: process.env.CREEM_CREDITS_200_PRODUCT_ID,
    pack_500: process.env.CREEM_CREDITS_500_PRODUCT_ID,
  };

  return mapping[packId]?.trim() || null;
}

export function getCreemObjectId(
  value: string | { id?: string | null } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

export function getCreemMetadata(
  value: Record<string, JsonValue> | null | undefined
): Record<string, string> {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item == null ? "" : String(item)])
  );
}

export function parseCreemDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
