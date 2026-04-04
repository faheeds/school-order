import { Card, PageShell, SectionTitle } from "@/components/ui";
import { env } from "@/lib/env";
import { ParentSignInButtons } from "./sign-in-buttons";

export default function ParentSignInPage() {
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const appleEnabled = Boolean(env.AUTH_APPLE_ID && env.AUTH_APPLE_SECRET);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdfa_0%,_#f5fbf8_100%)]">
      <PageShell className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md space-y-6">
          <SectionTitle
            eyebrow="Parent Account"
            title="Sign in to save kids and reorder faster"
            description="Use Google or Apple to keep saved children, order history, and weekly lunch planning in one place."
          />
          <ParentSignInButtons googleEnabled={googleEnabled} appleEnabled={appleEnabled} />
        </Card>
      </PageShell>
    </main>
  );
}
