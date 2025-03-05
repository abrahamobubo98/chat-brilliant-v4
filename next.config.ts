import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["tacit-cassowary-520.convex.cloud"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
