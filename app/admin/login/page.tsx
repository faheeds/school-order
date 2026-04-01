import { Card, PageShell, SectionTitle } from "@/components/ui";
import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdfa_0%,_#f5fbf8_100%)]">
      <PageShell className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md space-y-6">
          <SectionTitle
            eyebrow="Admin"
            title="Restaurant dashboard login"
            description="Use the seeded admin account or your production admin credentials."
          />
          <LoginForm />
        </Card>
      </PageShell>
    </main>
  );
}
