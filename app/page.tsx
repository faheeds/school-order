import Link from "next/link";
import { Card, PageShell } from "@/components/ui";

const quickPoints = [
  "Only open delivery dates",
  "Customize items quickly",
  "Confirmation by email"
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(58,149,103,0.14),_transparent_22%),linear-gradient(180deg,_#fffefb_0%,_#f4faf7_50%,_#fffdfa_100%)]">
      <PageShell className="space-y-8 pb-14 pt-8 sm:space-y-12 sm:pt-12">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-soft backdrop-blur">
          <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-14 lg:py-16">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-700">Local Bigger Burger</p>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
                  Medina Academy Hot Lunch Preorders
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Order hot lunch for the next open delivery date. Place a single order, or plan the week in one checkout.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/order"
                  className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Order single day
                </Link>
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700"
                >
                  Plan the week
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {quickPoints.map((point) => (
                  <div key={point} className="rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-4 text-sm font-medium text-brand-900">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Card className="border-0 bg-ink p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Made for Families</p>
                <p className="mt-4 text-3xl font-semibold">One day or the full week</p>
                <p className="mt-3 text-sm leading-6 text-slate-200">Sign in once, save your children, and reorder in a few clicks.</p>
              </Card>
              <Card className="border-0 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">How Ordering Works</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  <li>Pick a school and date.</li>
                  <li>Add items and customizations.</li>
                  <li>Pay online and get an email confirmation.</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>
      </PageShell>
    </main>
  );
}
