import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

// ── Env validation ─────────────────────────────────────────────────────────
// In production these MUST be set; fail loudly at startup rather than
// silently using localhost / dev-secret which breaks OAuth callbacks
// and session cookie verification.

const isDev = process.env.NODE_ENV === "development";

const BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL ||
  (isDev ? "http://localhost:3000" : undefined);

if (!BETTER_AUTH_URL) {
  throw new Error(
    "BETTER_AUTH_URL env var is required in production. " +
      "Set it to your public URL, e.g. https://www.dreamgf.online"
  );
}

const AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  (isDev ? "dev-secret" : undefined);

if (!AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET env var is required in production. " +
      "Run `openssl rand -hex 32` and set the result."
  );
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars are required."
  );
}

function getSharedCookieDomain(url: string) {
  try {
    const host = new URL(url).hostname;
    if (host === "dreamgf.online" || host === "www.dreamgf.online") {
      return ".dreamgf.online";
    }
  } catch {
    return undefined;
  }
}

const AUTH_COOKIE_DOMAIN =
  process.env.AUTH_COOKIE_DOMAIN ||
  (!isDev && process.env.VERCEL_ENV !== "preview"
    ? getSharedCookieDomain(BETTER_AUTH_URL)
    : undefined);

const authBaseURL = isDev
  ? BETTER_AUTH_URL
  : {
      allowedHosts: ["www.dreamgf.online", "dreamgf.online", "*.vercel.app"],
      fallback: BETTER_AUTH_URL,
      protocol: "https" as const,
    };

// ── Auth config ────────────────────────────────────────────────────────────

export const auth = betterAuth({
  baseURL: authBaseURL,
  secret: AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh every 24 h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  user: {
    additionalFields: {
      username: { type: "string", required: false },
      selectedCharacterId: { type: "string", required: false },
    },
    modelName: "user",
  },

  account: {
    modelName: "account",
  },

  advanced: {
    trustedProxyHeaders: true,
    useSecureCookies: BETTER_AUTH_URL.startsWith("https://"),
    ...(AUTH_COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: AUTH_COOKIE_DOMAIN,
          },
        }
      : {}),
  },

  plugins: [nextCookies()],

  // Both www and non-www must be listed so cookies are accepted regardless
  // of which variant the user lands on.
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "https://www.dreamgf.online",
    "https://dreamgf.online",
    "https://*.vercel.app",
  ],
});
