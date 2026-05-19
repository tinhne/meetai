import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  serverExternalPackages: ["@inngest/agent-kit", "inngest"],

  async headers() {
    if (!isDev) return [];

    return [
      {
        source: "/api/inngest",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, x-inngest-signature",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "meetai-assitant.vercel.app",
          },
        ],
        destination: "https://meetai-assistant.vercel.app/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
