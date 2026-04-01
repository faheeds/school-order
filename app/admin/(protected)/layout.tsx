import { AdminNav } from "@/components/admin/admin-nav";
import { PageShell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-50">
      <PageShell>
        <AdminNav />
        {children}
      </PageShell>
    </main>
  );
}
