import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow hot module replacement and scripts requests from local custom domain
  allowedDevOrigins: ['homemaidly.com', 'homemaidly.com:3000'],
} as any;

export default nextConfig;
