import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../shared/src'),
    };
    // Ensure .ts and .tsx extensions are resolved
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      ...(config.resolve.extensions || []),
    ];
    return config;
  },
  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      '@shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
};

export default nextConfig;
