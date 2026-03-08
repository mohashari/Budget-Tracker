import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trust proxy headers from ngrok / reverse proxies
  // This makes req.url / req.nextUrl use X-Forwarded-Host & X-Forwarded-Proto
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app', '*.ngrok.io', '*.slim.show'],
    },
  },
};

export default nextConfig;
