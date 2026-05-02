import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { optimizeSQL, queryModelSchema } from "@/lib/sql-generator";
import { hasPaidAccessFromRequest } from "@/lib/paywall";

const optimizeRequestSchema = z.object({
  model: queryModelSchema,
  sql: z.string().min(1)
});

export async function POST(request: NextRequest) {
  if (!hasPaidAccessFromRequest(request)) {
    return new NextResponse("Paid access required", { status: 402 });
  }

  try {
    const body = await request.json();
    const { model, sql } = optimizeRequestSchema.parse(body);

    const optimization = optimizeSQL(model, sql);

    return NextResponse.json(optimization);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not optimize SQL";
    return new NextResponse(message, { status: 400 });
  }
}
