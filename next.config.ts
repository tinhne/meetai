import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Report-only for now: violations show in the browser console without
// blocking anything. Switch to "Content-Security-Policy" once a full meeting
// (lobby, call, recording, chat, checkout) runs without violations.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.stream-io-api.com wss://*.stream-io-api.com",
    "https://*.stream-io-video.com wss://*.stream-io-video.com",
    "https://*.getstream.io wss://*.getstream.io",
    "https://*.stream-io-cdn.com",
    isDev ? "ws:" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https://*.polar.sh https://accounts.google.com https://github.com https://www.facebook.com",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  poweredByHeader: false,

  serverExternalPackages: ["@inngest/agent-kit", "inngest"],

  async headers() {
    const headers = [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];

    if (isDev) {
      headers.push({
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
      });
    }

    return headers;
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
