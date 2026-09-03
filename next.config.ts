import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Type errors must fail the build. Never relax this.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
