import Link from "next/link";
import { Card, PageShell, SectionTitle } from "@/components/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(95,177,135,0.25),_transparent_30%),linear-gradient(180deg,_#fffdfa_0%,_#f5fbf8_100%)]">
      <PageShell className="space-y-10">
        <SectionTitle
          eyebrow="School Lunch Preorders"
          title="A complete next-day lunch ordering system for restaurant delivery"
          description="Parents order online, pay securely, receive confirmations, and your team prints student-ready labels from the admin dashboard."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold">Parent ordering</h2>
            <p className="text-sm text-slate-600">
              Select a school and delivery date, customize the lunch, and pay online before the cutoff.
            </p>
            <Link href="/order" className="inline-flex rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
              Open order form
            </Link>
          </Card>
          <Card className="space-y-4">
            <h2 className="text-xl font-semibold">Restaurant admin</h2>
            <p className="text-sm text-slate-600">
              View paid orders by date, export CSVs, resend confirmations, and generate printable labels.
            </p>
            <Link href="/admin/login" className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold">
              Admin login
            </Link>
          </Card>
        </div>
      </PageShell>
    </main>
  );
}
