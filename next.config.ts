import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["tacit-cassowary-520.convex.cloud"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Optimize chunk loading
  webpack: (config, { isServer }) => {
    // Optimize client-side chunk loading
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        // Ensure chunks are properly created and loaded
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Critical commons chunk
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
            },
            // Vendor chunk (node_modules)
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
