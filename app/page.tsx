import Link from "next/link";
import { Card, PageShell } from "@/components/ui";

const highlights = [
  "Next-day ordering for Medina Academy families",
  "Secure online payment and automatic confirmations",
  "Restaurant-friendly labels and delivery prep tools"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(58,149,103,0.18),_transparent_24%),linear-gradient(180deg,_#fffefb_0%,_#f5fbf8_52%,_#fffdfa_100%)]">
      <PageShell className="space-y-10 pb-14 pt-8 sm:space-y-14 sm:pt-12">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-soft backdrop-blur">
          <div className="grid gap-10 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-16">
            <div className="space-y-7">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">Local Bigger Burger</p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
                  Medina Academy Hot Lunch Preorders
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Fresh hot lunches, simple online ordering, and a polished pickup workflow for Medina Academy families.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/order"
                  className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Start an order
                </Link>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700"
                >
                  Admin login
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-4 text-sm font-medium text-brand-800">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="border-0 bg-ink p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Ordering Window</p>
                <p className="mt-4 text-3xl font-semibold">Next-day lunch ordering</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Parents choose a school, select an available delivery date, customize lunch items, and pay online before the cutoff.
                </p>
              </Card>
              <Card className="border-0 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Restaurant Operations</p>
                <p className="mt-4 text-2xl font-semibold text-ink">Built for Local Bigger Burger</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Paid orders, printable student labels, CSV exports, and admin order management are all available in one place.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-3 bg-white/90">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">1. Choose</p>
            <h2 className="text-2xl font-semibold text-ink">School and date</h2>
            <p className="text-sm leading-6 text-slate-600">
              Families can quickly find the right campus and choose from the currently available delivery dates.
            </p>
          </Card>
          <Card className="space-y-3 bg-white/90">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">2. Customize</p>
            <h2 className="text-2xl font-semibold text-ink">Lunch preferences</h2>
            <p className="text-sm leading-6 text-slate-600">
              Add-ons, removals, allergy notes, and student details are captured clearly before payment.
            </p>
          </Card>
          <Card className="space-y-3 bg-white/90">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">3. Deliver</p>
            <h2 className="text-2xl font-semibold text-ink">Prepared for service</h2>
            <p className="text-sm leading-6 text-slate-600">
              Your team can review paid orders, print labels, and prepare delivery with confidence.
            </p>
          </Card>
        </section>
      </PageShell>
    </main>
  );
}
