import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  disable:
    process.env.NODE_ENV === "development" && process.env.ENABLE_PWA !== "true",
});

const nextConfig: NextConfig = {
  output: "standalone",
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
