import { NextRequest, NextResponse } from "next/server";

import { generateSQL, queryModelSchema } from "@/lib/sql-generator";
import { hasPaidAccessFromRequest } from "@/lib/paywall";

export async function POST(request: NextRequest) {
  if (!hasPaidAccessFromRequest(request)) {
    return new NextResponse("Paid access required", { status: 402 });
  }

  try {
    const body = await request.json();
    const model = queryModelSchema.parse(body);

    const sql = generateSQL(model);

    return NextResponse.json({ sql });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate SQL";
    return new NextResponse(message, { status: 400 });
  }
}
