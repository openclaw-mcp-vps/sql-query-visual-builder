"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, DatabaseZap, Lock, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LandingPageClientProps {
  hasAccess: boolean;
}

const faqs = [
  {
    question: "Who is this product for?",
    answer:
      "Product managers, growth analysts, customer success ops, and marketing analysts who need SQL output but don't want SQL syntax to be the blocker."
  },
  {
    question: "Does it connect to production databases?",
    answer:
      "Yes. Use a read-only database user. The app introspects schema metadata and generates SQL from your drag-and-drop query model."
  },
  {
    question: "How does payment unlock the dashboard?",
    answer:
      "After Stripe Checkout redirects back with a checkout session ID, the app verifies payment server-side and sets a secure access cookie."
  },
  {
    question: "Can engineers still review the output?",
    answer:
      "Absolutely. The generated SQL is explicit and copyable, making engineer review and iteration straightforward."
  }
];

export function LandingPageClient({ hasAccess: initialAccess }: LandingPageClientProps) {
  const searchParams = useSearchParams();
  const [hasAccess, setHasAccess] = useState(initialAccess);
  const [verifying, setVerifying] = useState(false);

  const checkoutSessionId = searchParams.get("checkout_session_id");
  const stripePaymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  useEffect(() => {
    if (!checkoutSessionId || hasAccess) {
      return;
    }

    let active = true;

    const verifyCheckout = async () => {
      setVerifying(true);
      try {
        const response = await fetch("/api/paywall/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: checkoutSessionId })
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Verification failed");
        }

        if (active) {
          setHasAccess(true);
          toast.success("Payment confirmed. Dashboard unlocked.");
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Could not verify your checkout session";
          toast.error(message);
        }
      } finally {
        if (active) {
          setVerifying(false);
        }
      }
    };

    void verifyCheckout();

    return () => {
      active = false;
    };
  }, [checkoutSessionId, hasAccess]);

  const buyButtonDisabled = useMemo(() => !stripePaymentLink || stripePaymentLink.trim().length === 0, [stripePaymentLink]);

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#1f2630] bg-[#0d1117]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-5 w-5 text-sky-400" />
            <span className="text-sm font-semibold tracking-wide text-white">SQL Query Visual Builder</span>
          </div>
          <div className="flex items-center gap-2">
            {hasAccess ? (
              <Link href="/dashboard">
                <Button size="sm">Open Dashboard</Button>
              </Link>
            ) : (
              <a href={stripePaymentLink ?? ""}>
                <Button size="sm" disabled={buyButtonDisabled}>
                  Buy Access
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-14 md:px-8 md:pt-20">
        <Badge className="w-fit">Built for product and analytics teams</Badge>
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl">
              Build complex SQL queries with drag-drop
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[#9fb0c0]">
              Non-technical teammates can compose joins, filters, and sorted reports visually while still producing clean SQL your engineering team can trust.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {hasAccess ? (
                <Link href="/dashboard">
                  <Button size="lg">
                    Launch Builder
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <a href={stripePaymentLink ?? ""}>
                  <Button size="lg" disabled={buyButtonDisabled}>
                    Start for $18/mo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              )}
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  View Dashboard
                </Button>
              </Link>
            </div>
            {!hasAccess ? (
              <p className="mt-3 text-sm text-[#8b949e]">
                After checkout, configure Stripe Payment Link to redirect with
                <code className="mx-1 rounded bg-[#1c2430] px-1 py-0.5 text-sky-300">
                  {"?checkout_session_id={CHECKOUT_SESSION_ID}"}
                </code>
                for automatic unlock.
              </p>
            ) : null}
          </div>

          <Card className="border-sky-500/30 bg-gradient-to-b from-[#1a2738] to-[#141a23]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-sky-400" />
                What You Get
              </CardTitle>
              <CardDescription>Production-ready query drafting in minutes, not tickets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                <span>Drag tables/fields into a visual canvas and generate SQL instantly.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                <span>Live optimization suggestions flag missing filters, limits, and index risks.</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                <span>Copy SQL directly into BI tools or hand off to engineering confidently.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {verifying ? (
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">
            Verifying your checkout session and unlocking access...
          </div>
        ) : null}
        {!stripePaymentLink ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            NEXT_PUBLIC_STRIPE_PAYMENT_LINK is not configured. Add it to your environment to enable checkout.
          </div>
        ) : null}
      </section>

      <section className="border-y border-[#202734] bg-[#121821] py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 md:grid-cols-3 md:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Problem</CardTitle>
              <CardDescription>SQL syntax bottlenecks</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#9fb0c0]">
              Product and analytics teams wait on engineering for basic data pulls because handwritten SQL is error-prone and intimidating.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Solution</CardTitle>
              <CardDescription>Visual first, SQL always available</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#9fb0c0]">
              The builder transforms drag-and-drop operations into structured SQL with safe defaults, so non-SQL users still deliver trustworthy queries.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Outcome</CardTitle>
              <CardDescription>Faster decisions</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#9fb0c0]">
              Analysts iterate independently, PMs self-serve metrics, and engineers spend less time writing one-off reporting queries.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
        <Card className="border-sky-500/40 bg-gradient-to-r from-[#162536] to-[#1b2b3f]">
          <CardHeader>
            <CardTitle className="text-3xl">Simple Pricing</CardTitle>
            <CardDescription>Single plan for teams that need SQL output without SQL authoring overhead.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-4xl font-bold text-white">$18<span className="text-base font-normal text-[#9fb0c0]">/month</span></p>
              <p className="mt-2 text-sm text-[#c9d1d9]">Includes visual query builder, real-time SQL preview, and optimization suggestions.</p>
            </div>
            <div className="flex items-center gap-2">
              {hasAccess ? (
                <Link href="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              ) : (
                <a href={stripePaymentLink ?? ""}>
                  <Button size="lg" disabled={buyButtonDisabled}>
                    Buy Now
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
        <h2 className="mb-5 text-2xl font-semibold text-white">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#9fb0c0]">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1f2630] py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 text-xs text-[#6e7681] md:px-8">
          <span>SQL Query Visual Builder</span>
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            Cookie-based dashboard access
          </span>
        </div>
      </footer>
    </main>
  );
}
