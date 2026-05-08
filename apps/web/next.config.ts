import type { NextConfig } from "next";

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

export default nextConfig;
