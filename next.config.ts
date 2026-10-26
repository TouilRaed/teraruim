import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve modern formats to ad traffic; avif first, webp fallback.
    formats: ["image/avif", "image/webp"],
    // Optimized images rarely change — cache hard at the CDN edge.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
