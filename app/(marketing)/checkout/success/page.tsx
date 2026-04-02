import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageShell, SectionTitle } from "@/components/ui";
import { formatCurrency, formatList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const order = params.order
    ? await prisma.order.findUnique({
        where: { id: params.order },
        include: { student: true, deliveryDate: true, school: true, items: true }
      })
    : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdfa_0%,_#f5fbf8_100%)]">
      <PageShell className="space-y-6">
        <SectionTitle
          eyebrow="Payment Complete"
          title="Thanks, your order is being processed"
          description="A confirmation email is sent automatically after the payment webhook marks the order as paid."
        />
        <Card className="space-y-4">
          {order ? (
            <>
              <p className="text-sm text-slate-600">Order number: {order.orderNumber}</p>
              <p className="text-sm text-slate-600">Student: {order.student.studentName}</p>
              <p className="text-sm text-slate-600">Items: {order.items.map((item) => item.itemNameSnapshot).join(", ")}</p>
              <p className="text-sm text-slate-600">Additions: {formatList(order.items.flatMap((item) => item.additions))}</p>
              <p className="text-sm text-slate-600">Removals: {formatList(order.items.flatMap((item) => item.removals))}</p>
              <p className="text-sm text-slate-600">Total: {formatCurrency(order.totalCents)}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">Your payment succeeded. The order record will appear as soon as the webhook completes.</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
              Back to home
            </Link>
            <Link href="/order" className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold">
              Place another order
            </Link>
          </div>
        </Card>
      </PageShell>
    </main>
  );
}
