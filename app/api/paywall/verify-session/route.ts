import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { attachPaidAccessCookie } from "@/lib/paywall";
import { getStripeClient } from "@/lib/stripe";

const verifySessionSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("cs_"), "Invalid checkout session id")
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = verifySessionSchema.parse(body);

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid =
      session.payment_status === "paid" ||
      session.status === "complete" ||
      (session.mode === "subscription" && Boolean(session.subscription));

    if (!paid) {
      return new NextResponse("Checkout session has not completed payment", { status: 402 });
    }

    const response = NextResponse.json({ ok: true });
    attachPaidAccessCookie(response);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session verification failed";
    const status = message.includes("STRIPE_SECRET_KEY") ? 503 : 400;
    return new NextResponse(message, { status });
  }
}
