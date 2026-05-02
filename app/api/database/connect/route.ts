import { NextRequest, NextResponse } from "next/server";

import { databaseConfigSchema, testConnection } from "@/lib/database-adapters";
import { hasPaidAccessFromRequest } from "@/lib/paywall";

export async function POST(request: NextRequest) {
  if (!hasPaidAccessFromRequest(request)) {
    return new NextResponse("Paid access required", { status: 402 });
  }

  try {
    const body = await request.json();
    const config = databaseConfigSchema.parse(body);

    await testConnection(config);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    return new NextResponse(message, { status: 400 });
  }
}
