import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Increase Server Action request body size to allow up to 10 MB uploads
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
