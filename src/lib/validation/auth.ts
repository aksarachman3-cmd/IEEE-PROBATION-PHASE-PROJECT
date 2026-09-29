import { z } from "zod";

/** Sign-in credentials. Normalised before validation so " Admin@ITB.ac.id " works. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." })),
  password: z
    .string()
    .min(1, { error: "Enter your password." })
    .max(200, { error: "Password is too long." }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>;

/**
 * The same rules the sign-up form would use. Only enforced when
 * `SEED_ADMIN_PASSWORD` is set, so evaluators can pick their own password.
 */
export const passwordPolicy = z
  .string()
  .min(10, { error: "Use at least 10 characters." })
  .max(200, { error: "Password is too long." })
  .regex(/[a-z]/, { error: "Include a lowercase letter." })
  .regex(/[A-Z]/, { error: "Include an uppercase letter." })
  .regex(/[0-9]/, { error: "Include a number." });
