import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@inngest/agent-kit", "inngest"],
  async headers() {
    // Chỉ bật CORS lỏng lẻo khi đang chạy ở máy local (Development)
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
};

export default nextConfig;
