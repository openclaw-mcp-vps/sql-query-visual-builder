import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getBillingProviderStatus } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripeSignature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSignature || !webhookSecret) {
    return new NextResponse("Missing Stripe webhook signature or STRIPE_WEBHOOK_SECRET", { status: 400 });
  }

  const payload = await request.text();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

  try {
    const event = stripe.webhooks.constructEvent(payload, stripeSignature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return NextResponse.json({
        received: true,
        event: event.type,
        sessionId: session.id,
        billing: getBillingProviderStatus()
      });
    }

    return NextResponse.json({ received: true, event: event.type, billing: getBillingProviderStatus() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook validation failed";
    return new NextResponse(message, { status: 400 });
  }
}
