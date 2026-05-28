import type { NextConfig } from "next";

// Baseline security headers applied to every response. HSTS is a no-op over
// plain HTTP (browsers ignore it on localhost), so it's safe in dev. A full
// script/style CSP is intentionally deferred (needs a nonce pipeline for Next's
// inline scripts); `frame-ancestors 'none'` is the modern clickjacking guard
// alongside X-Frame-Options.
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

export default nextConfig;
