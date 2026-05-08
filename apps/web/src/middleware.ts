import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value?.trim();
  const userCookie = request.cookies.get("user")?.value?.trim();
  const isAuthenticated = !!token && !!userCookie;
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!_next|favicon).*)"],
};
