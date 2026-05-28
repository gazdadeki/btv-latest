import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  fallbacks: { document: "/offline" },
  disable:
    process.env.NODE_ENV === "development" && process.env.ENABLE_PWA !== "true",
});

// Baseline security headers applied to every response. HSTS is a no-op over
// plain HTTP (ignored on localhost), so it's safe in dev. `payment` is left at
// the browser default (allowed for self) so Stripe / Apple Pay keep working; we
// only lock down camera/microphone/geolocation, which the player app never uses.
// A full script/style CSP is deferred (Next inline scripts + the PWA service
// worker need a nonce pipeline); `frame-ancestors 'none'` guards clickjacking.
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/avatars/:path*",
        destination: `${backend}/avatars/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
