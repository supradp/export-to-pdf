import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure the project directory is used as root (avoids picking up unrelated lockfiles).
    root: __dirname,
  },
  // Required for serverless Chromium packages on Vercel.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
