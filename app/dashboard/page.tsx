import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { QueryBuilder } from "@/components/QueryBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPaidAccess } from "@/lib/paywall";

export default async function DashboardPage() {
  const paid = await hasPaidAccess();

  if (!paid) {
    const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LockKeyhole className="h-6 w-6 text-sky-400" />
              Dashboard Locked
            </CardTitle>
            <CardDescription>
              This workspace is available to paid subscribers. Complete checkout to unlock the visual SQL builder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a href={paymentLink ?? ""}>
              <Button className="w-full" disabled={!paymentLink}>
                Buy Access for $18/month
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Landing Page
              </Button>
            </Link>
            <p className="text-xs text-[#8b949e]">
              After successful checkout, return with <code>{"?checkout_session_id={CHECKOUT_SESSION_ID}"}</code> to enable the access cookie.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Query Builder Dashboard</h1>
          <p className="mt-1 text-sm text-[#8b949e]">
            Build joins, filters, and sorted results visually, then export optimized SQL.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Landing</Button>
        </Link>
      </div>

      <QueryBuilder />
    </main>
  );
}
