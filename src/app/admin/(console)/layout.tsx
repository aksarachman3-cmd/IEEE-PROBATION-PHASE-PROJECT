import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/ui/toast";
import { requireAdminPage } from "@/lib/auth/guard";
import { APP_NAME } from "@/lib/constants";

/**
 * Layout for every authenticated admin route.
 *
 * The guard runs here rather than in each page, so a new page added under
 * `/admin` is protected by default rather than by remembering to add a check —
 * the safest failure mode when the whole subtree is sensitive.
 */
export const metadata: Metadata = {
  title: { default: `Operations — ${APP_NAME}`, template: `%s — ${APP_NAME}` },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <ToastProvider>
      <AdminShell adminName={admin.name} adminEmail={admin.email}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
