import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const PRODUCTION_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  baseURL: PRODUCTION_URL,
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || "dev-secret",

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      prompt: "select_account",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
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

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    // Production — covers both with and without www
    ...(PRODUCTION_URL ? [PRODUCTION_URL] : []),
    ...(PRODUCTION_URL.includes("://www.")
      ? [PRODUCTION_URL.replace("://www.", "://")]
      : PRODUCTION_URL.includes("://")
      ? [PRODUCTION_URL.replace("://", "://www.")]
      : []),
  ],
});
