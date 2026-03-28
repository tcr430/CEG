import path from "node:path";

import type { NextConfig } from "next";

const workspacePackageAliases = {
  "@ceg/auth": path.resolve(__dirname, "../../packages/auth/dist/index.js"),
  "@ceg/billing": path.resolve(__dirname, "../../packages/billing/dist/index.js"),
  "@ceg/database": path.resolve(__dirname, "../../packages/database/dist/index.js"),
  "@ceg/observability": path.resolve(__dirname, "../../packages/observability/dist/index.js"),
  "@ceg/reply-engine": path.resolve(__dirname, "../../packages/reply-engine/dist/index.js"),
  "@ceg/research-engine": path.resolve(__dirname, "../../packages/research-engine/dist/index.js"),
  "@ceg/security": path.resolve(__dirname, "../../packages/security/dist/index.js"),
  "@ceg/sequence-engine": path.resolve(__dirname, "../../packages/sequence-engine/dist/index.js"),
  "@ceg/validation": path.resolve(__dirname, "../../packages/validation/dist/index.js"),
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      ...workspacePackageAliases,
    };

    return config;
  },
};

export default nextConfig;
