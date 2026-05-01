import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { auth } from "./better-auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      image: true,
      selectedCharacterId: true,
      selectedCharacter: true,
    },
  });
}

function getFallbackAuthOrigin() {
  return (
    process.env.AUTH_CANONICAL_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

export async function getAuthHeaders(request?: Request) {
  const headersList = new Headers();

  if (request) {
    request.headers.forEach((value, key) => {
      headersList.set(key, value);
    });
  }

  const nextHeaders = await headers();
  nextHeaders.forEach((value, key) => {
    if (!headersList.has(key)) {
      headersList.set(key, value);
    }
  });

  if (!headersList.has("cookie")) {
    const cookieHeader = (await cookies())
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    if (cookieHeader) headersList.set("cookie", cookieHeader);
  }

  if (!headersList.has("host") && !headersList.has("x-forwarded-host")) {
    const authOrigin = new URL(getFallbackAuthOrigin());
    headersList.set("host", authOrigin.host);
    headersList.set("x-forwarded-host", authOrigin.host);
    headersList.set("x-forwarded-proto", authOrigin.protocol.replace(":", ""));
  }

  return headersList;
}

export async function getCurrentUser(request?: Request) {
  const cookieStore = await cookies();

  const jwtToken = cookieStore.get("token")?.value;
  if (jwtToken) {
    const decoded = verifyToken(jwtToken);
    if (decoded) {
      const user = await getUserById(decoded.userId);
      if (user) return user;
    }
  }

  try {
    const session = await auth.api.getSession({
      headers: await getAuthHeaders(request),
    });
    if (session?.user?.id) {
      return getUserById(session.user.id);
    }
  } catch (error) {
    console.error("Better Auth session lookup failed:", error);
  }

  return null;
}
