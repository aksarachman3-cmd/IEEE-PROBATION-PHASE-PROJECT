"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { authenticate } from "@/lib/services/auth-service";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Server Actions for authentication.
 *
 * Actions are the mutation path for the UI. They are always POST-only,
 * always server-validated, and always re-check authorisation on the server —
 * the client never decides whether an action is allowed.
 */

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

/**
 * Sign in an administrator.
 *
 * On success the session cookie is set and the browser is sent on to `next`.
 * On failure we return field errors rather than redirecting, so the form can
 * re-render with the user's email preserved and the message shown inline.
 */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    // Read `issues` directly: it covers errors raised by refinements, whereas
    // `flatten().fieldErrors` only surfaces the first message per field.
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string") continue;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    return {
      status: "error",
      message: "Incorrect email or password.",
    };
  }

  await createSession(result.user.id);

  // `next` is attacker-controllable, so reuse the same sanitiser the sign-in
  // page uses rather than trusting the raw query value.
  const next = safeNextPath(formData.get("next")?.toString());

  revalidatePath("/", "layout");
  redirect(next);
}

/** Sign out, clear the cookie, and return to the public catalogue. */
export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}
