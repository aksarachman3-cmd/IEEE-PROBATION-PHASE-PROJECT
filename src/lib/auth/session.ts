import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * Opaque, server-side sessions.
 *
 * Flow:
 *  1. Login generates 32 bytes of CSPRNG entropy → the *raw token*.
 *  2. Only `HMAC-SHA256(secret, rawToken)` is written to the database.
 *  3. The raw token goes into an httpOnly, SameSite=Lax, Secure-in-prod cookie.
 *
 * Consequences worth explaining in an interview:
 *  - A stolen database cannot be replayed as a login, because the HMAC key lives
 *    in the environment, not the database.
 *  - Signing out deletes the row, so the session is genuinely revoked — unlike
 *    stateless JWTs which stay valid until they expire.
 *  - The cookie is unreadable from JavaScript, so XSS cannot exfiltrate it.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

let warnedAboutSecret = false;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it in .env — generate one with: " +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // Development convenience only: keep the app runnable straight after cloning
  // without ever shipping a hard-coded production secret.
  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn(
      "[auth] SESSION_SECRET is not set — falling back to a fixed development key. " +
        "Sessions will not survive a restart and must never be used in production.",
    );
  }
  return "dev-only-insecure-session-secret";
}

/** HMAC the raw token so only a digest is ever persisted. */
function hashToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

function expiryDate(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

/**
 * Create a session for a user and write the cookie.
 * Expired rows are swept opportunistically — cheap, and it keeps the table small.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiryDate();

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Resolve a raw token to its user, or `null` if invalid/expired. */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    // Lazily clean up so a stale cookie stops costing a DB read on every request.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

/** Read the session cookie from the current request and resolve it. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Revoke the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
