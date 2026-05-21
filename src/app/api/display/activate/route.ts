import { NextResponse } from "next/server";
import { setKioskCookie, validateKioskToken } from "@/lib/kiosk";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const row = await validateKioskToken(token);
  if (!row) {
    return NextResponse.redirect(new URL("/display/setup", req.url));
  }
  await setKioskCookie(token!);
  return NextResponse.redirect(new URL("/display", req.url));
}
