import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Note: this module deliberately does *not* import `server-only`.
 * It is pure `node:crypto` with no Next.js dependencies, so it is safe to share
 * with `prisma/seed.ts` — and sharing it guarantees the seed hashes passwords
 * exactly the way the app verifies them. (`server-only` throws when imported
 * from a plain Node script, which would force a duplicate implementation.)
 * The `node:crypto` import would already fail the build if this ever reached a
 * Client Component bundle.
 */

const scryptAsync = promisify(scrypt);

/** 64 bytes = 512 bits of derived key material. */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const ALGORITHM = "scrypt";

/**
 * Hash a plaintext password.
 *
 * Uses Node's built-in `scrypt` (memory-hard KDF) rather than adding a native
 * bcrypt dependency. The result is self-describing so the parameters can be
 * changed later without invalidating existing hashes:
 *
 *   scrypt$<salt-base64>$<hash-base64>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH)) as Buffer;
  return [ALGORITHM, salt.toString("base64"), derivedKey.toString("base64")].join("$");
}

/**
 * Verify a plaintext password against a stored hash.
 *
 * Returns `false` (never throws) for malformed or legacy-format hashes so a
 * corrupt row can never crash the login endpoint.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltPart, hashPart] = storedHash.split("$");
  if (algorithm !== ALGORITHM || !saltPart || !hashPart) return false;

  const salt = Buffer.from(saltPart, "base64");
  const expected = Buffer.from(hashPart, "base64");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = (await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, expected);
}
