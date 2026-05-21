import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/2fa", "/api/auth", "/display", "/api/display"];
const COOKIE = "saysanaa_session";

function isPublic(path: string) {
  return PUBLIC.some((p) => path === p || path.startsWith(p + "/"));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname === "/"
  ) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;
  let payload: any = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
      const r = await jwtVerify(token, secret);
      payload = r.payload;
    } catch {
      payload = null;
    }
  }

  if (isPublic(pathname)) {
    // Already fully signed in → keep them out of auth pages
    if (payload && !payload.pending2fa && (pathname === "/login" || pathname === "/2fa")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Pending 2FA must finish 2FA
    if (payload?.pending2fa && pathname === "/login") {
      return NextResponse.redirect(new URL("/2fa", req.url));
    }
    return NextResponse.next();
  }

  if (!payload) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  if (payload.pending2fa) {
    return NextResponse.redirect(new URL("/2fa", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
