import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/verification',
  '/reset-password',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  // Use the user cookie as the client-readable auth indicator.
  // The actual httpOnly tokens are validated by the backend on every API call.
  const isAuthenticated = !!request.cookies.get('user');

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|favicon|icons|manifest|sw\\.js|workbox-.*|api).*)',
  ],
};
