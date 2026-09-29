import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/ui/logo";
import { ShieldCheckIcon } from "@/components/icons";
import { getOptionalAdmin } from "@/lib/auth/guard";
import { safeNextPath } from "@/lib/auth/redirect";
import { APP_NAME } from "@/lib/constants";

/**
 * Administrator sign-in page.
 *
 * If a valid session already exists there is nothing to do here, so send the
 * admin straight to the dashboard rather than showing a redundant form.
 */
export const metadata: Metadata = {
  title: `Admin sign in — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getOptionalAdmin()) {
    redirect("/admin");
  }

  const next = safeNextPath((await searchParams).next);

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo className="mb-10" />

          <div className="mb-8">
            <h1 className="font-display-lg text-ink">Sign in to the operations console</h1>
            <p className="mt-2 text-body-md text-meta">
              Event management is restricted to authorised administrators of the IEEE ITB Student
              Branch.
            </p>
          </div>

          <LoginForm next={next} />
        </div>
      </div>

      {/* Brand column — decorative, hidden on small screens. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-on-secondary-fixed p-12 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent 0 28px, #ffffff 28px 29px)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 rounded-full border border-[#3c4858]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-20 size-[26rem] rounded-full border border-[#3c4858]"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#3c4858] px-3 py-1.5 text-label-sm text-surface-container-high">
            <ShieldCheckIcon className="size-4" />
            Authorised access only
          </span>
        </div>

        <div className="relative max-w-md space-y-4">
          <h2 className="font-display-md leading-tight text-surface-container-lowest">
            Every event, from draft to published, in one place.
          </h2>
          <p className="text-body-md text-[#c3c8d4]">
            Create listings, control publication state, track registrations and keep the public
            catalog accurate — with every change validated on the server and recorded against your
            account.
          </p>
        </div>

        <p className="relative text-body-sm text-[#8b95a8]">
          Sessions last 8 hours and are stored in an httpOnly cookie.
        </p>
      </aside>
    </main>
  );
}
