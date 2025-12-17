import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/rpc',
        destination: 'http://127.0.0.1:9545',
      },
    ];
  },
};

export default nextConfig;
