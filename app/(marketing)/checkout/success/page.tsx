import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Card, PageShell, SectionTitle } from "@/components/ui";
import { sendOrderConfirmationEmail } from "@/lib/email/service";
import { markOrderPaidByCheckoutSession } from "@/lib/orders";
import { stripe } from "@/lib/payments/stripe";
import { formatCurrency, formatList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  let order = params.order
    ? await prisma.order.findUnique({
        where: { id: params.order },
        include: { student: true, deliveryDate: true, school: true, items: true, payment: true }
      })
    : null;

  if (
    order &&
    order.status !== OrderStatus.PAID &&
    params.session_id &&
    stripe
  ) {
    try {
      const session = await stripe.checkout.sessions.retrieve(params.session_id);
      if (session.payment_status === "paid") {
        order = await markOrderPaidByCheckoutSession(
          session.id,
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          session.amount_total ?? null
        );

        if (!order.confirmationSentAt) {
          try {
            await sendOrderConfirmationEmail(order.id);
          } catch {
            // Email failures are logged and can be retried in admin.
          }
        }
      }
    } catch {
      // If Stripe reconciliation fails here, the webhook can still complete the order asynchronously.
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffdfa_0%,_#f5fbf8_100%)]">
      <PageShell className="space-y-6">
        <SectionTitle
          eyebrow="Payment Complete"
          title="Thanks, your order is being processed"
          description="A confirmation email is sent automatically after payment is confirmed."
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
