import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import { getAuthHeaders } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function redactUrl(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return "invalid-url";
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const nextHeaders = await headers();
  const authHeaders = await getAuthHeaders(request);
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  let sessionError: string | null = null;

  try {
    session = await auth.api.getSession({
      headers: authHeaders,
      query: {
        disableCookieCache: true,
        disableRefresh: true,
      },
    });
  } catch (error) {
    sessionError = getErrorMessage(error);
  }

  let databaseReachable = false;
  let databaseError: string | null = null;

  try {
    await prisma.user.findFirst({ select: { id: true } });
    databaseReachable = true;
  } catch (error) {
    databaseError = getErrorMessage(error);
  }

  return NextResponse.json(
    {
      request: {
        url: request.url,
        host: nextHeaders.get("host"),
        forwardedHost: nextHeaders.get("x-forwarded-host"),
        forwardedProto: nextHeaders.get("x-forwarded-proto"),
        requestCookieHeaderLength: request.headers.get("cookie")?.length ?? 0,
        mergedCookieHeaderLength: authHeaders.get("cookie")?.length ?? 0,
      },
      cookies: {
        names: cookieNames,
        hasJwtCookie: cookieNames.includes("token"),
        hasBetterAuthCookie: cookieNames.some((name) =>
          name.toLowerCase().includes("better-auth")
        ),
        hasBetterAuthSessionCookie: cookieNames.some((name) =>
          name.toLowerCase().includes("better-auth.session_token")
        ),
      },
      betterAuth: {
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        sessionId: session?.session?.id ?? null,
        sessionError,
      },
      database: {
        reachable: databaseReachable,
        error: databaseError,
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV ?? null,
        BETTER_AUTH_URL: redactUrl(process.env.BETTER_AUTH_URL),
        AUTH_CANONICAL_URL: redactUrl(process.env.AUTH_CANONICAL_URL),
        HAS_BETTER_AUTH_SECRET: !!process.env.BETTER_AUTH_SECRET,
        HAS_GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        HAS_GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    }
  );
}
