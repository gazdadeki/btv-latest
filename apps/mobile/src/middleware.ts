import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/verification",
  "/reset-password",
];

function parseUserCookie(request: NextRequest): {
  exists: boolean;
  isVerified: boolean;
} {
  const cookie = request.cookies.get("user");
  if (!cookie?.value) return { exists: false, isVerified: false };
  try {
    const user = JSON.parse(decodeURIComponent(cookie.value));
    return { exists: true, isVerified: !!user.isVerified };
  } catch {
    return { exists: false, isVerified: false };
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fully ungated routes: render for every auth state. Unlike PUBLIC_PATHS,
  // these are NOT bounced to /home when an authenticated user visits them
  // (the install/landing page must render for installed users too, and the
  // offline fallback must not redirect — a redirect itself fails offline).
  if (
    pathname === "/install" ||
    pathname.startsWith("/install/") ||
    pathname === "/offline"
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const { exists: isAuthenticated, isVerified } = parseUserCookie(request);

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && !isVerified && !pathname.startsWith("/verification")) {
    return NextResponse.redirect(new URL("/verification", request.url));
  }

  if (
    isAuthenticated &&
    isVerified &&
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon|icons|manifest|apple-touch-icon|sw\\.js|workbox-.*|api).*)",
  ],
};
