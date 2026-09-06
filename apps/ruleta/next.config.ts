import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@openruleta/config",
    "@openruleta/core",
    "@openruleta/ui",
  ],
};

export default nextConfig;
