import { NextResponse } from "next/server";
import { orderFormSchema } from "@/lib/validation/order";
import { createPendingOrder } from "@/lib/orders";
import { createStripeCheckoutSession } from "@/lib/payments/checkout";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderFormSchema.parse(body);

    const provisionalOrder = await createPendingOrder(parsed);

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY before testing checkout." },
        { status: 500 }
      );
    }

    const session = await createStripeCheckoutSession({
      orderId: provisionalOrder.id,
      orderNumber: provisionalOrder.orderNumber,
      parentEmail: provisionalOrder.parentEmail,
      lineItems: provisionalOrder.items.map((item) => ({
        name: `School lunch preorder: ${item.itemNameSnapshot}`,
        description: `Order ${provisionalOrder.orderNumber}`,
        amountCents: item.lineTotalCents
      }))
    });

    await prisma.order.update({
      where: { id: provisionalOrder.id },
      data: {
        checkoutSessionId: session.id,
        payment: {
          update: {
            providerSessionId: session.id
          }
        }
      }
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
