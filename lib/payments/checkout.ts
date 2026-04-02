import { stripe } from "@/lib/payments/stripe";
import { env } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";

type CheckoutArgs = {
  orderId: string;
  orderNumber: string;
  parentEmail: string;
  lineItems: {
    name: string;
    description: string;
    amountCents: number;
  }[];
};

export async function createStripeCheckoutSession(args: CheckoutArgs) {
  if (!stripe) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to continue.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: args.parentEmail,
    billing_address_collection: "required",
    automatic_tax: {
      enabled: true
    },
    success_url: `${env.APP_BASE_URL}/checkout/success?order=${args.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_BASE_URL}/order?cancelled=1`,
    metadata: {
      orderId: args.orderId,
      orderNumber: args.orderNumber
    },
    line_items: args.lineItems.map((item) => ({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          description: item.description
        }
      ,
        unit_amount: item.amountCents
      }
    }))
  });

  return session;
}

export function getPaymentSummary(amountCents: number) {
  return formatCurrency(amountCents);
}
