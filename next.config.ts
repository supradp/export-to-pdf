import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure the project directory is used as root (avoids picking up unrelated lockfiles).
    root: __dirname,
  },
};

export default nextConfig;
