import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_access_token");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const userCookie = request.cookies.get("admin_user");
  if (token && userCookie && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/((?!_next|favicon).*)"],
};
