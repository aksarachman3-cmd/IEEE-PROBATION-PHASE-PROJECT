import "server-only";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/session";

/**
 * A pre-computed hash used to keep the "unknown email" path as slow as the
 * "wrong password" path. Without it, response timing would reveal which
 * addresses have accounts.
 */
let decoyHash: string | null = null;

async function getDecoyHash(): Promise<string> {
  decoyHash ??= await hashPassword("decoy-password-for-constant-time-login");
  return decoyHash;
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; message: string };

/**
 * Verify credentials.
 *
 * Returns the same generic message for both "no such user" and "wrong
 * password" so the endpoint cannot be used to enumerate admin accounts.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(password, await getDecoyHash());
    return { ok: false, message: "Email or password is incorrect." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "Email or password is incorrect." };
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: string;
}) {
  return prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: await hashPassword(input.password),
      role: input.role ?? "ADMIN",
    },
  });
}
