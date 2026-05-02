import { NextRequest, NextResponse } from "next/server";

import { databaseConfigSchema, fetchSchema } from "@/lib/database-adapters";
import { hasPaidAccessFromRequest } from "@/lib/paywall";

export async function POST(request: NextRequest) {
  if (!hasPaidAccessFromRequest(request)) {
    return new NextResponse("Paid access required", { status: 402 });
  }

  try {
    const body = await request.json();
    const config = databaseConfigSchema.parse(body);

    const schema = await fetchSchema(config);

    return NextResponse.json(schema);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schema loading failed";
    return new NextResponse(message, { status: 400 });
  }
}
