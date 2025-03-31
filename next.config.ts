import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'localhost',
        port: '4566',
      },
    ],
  },
};

export default nextConfig;
