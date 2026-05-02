import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PAID_ACCESS_COOKIE = "sql_builder_paid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function hasPaidAccess(): Promise<boolean> {
  const store = await cookies();
  return store.get(PAID_ACCESS_COOKIE)?.value === "1";
}

export function hasPaidAccessFromRequest(request: NextRequest): boolean {
  return request.cookies.get(PAID_ACCESS_COOKIE)?.value === "1";
}

export function attachPaidAccessCookie(response: NextResponse): NextResponse {
  response.cookies.set(PAID_ACCESS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });
  return response;
}
