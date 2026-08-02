import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard', // Replace with your actual starting page (e.g., '/login')
        permanent: false,
      },
    ];
  },
};

export default nextConfig;