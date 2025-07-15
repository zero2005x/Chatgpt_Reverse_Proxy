import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    AI_BASE_URL: process.env.AI_BASE_URL || 'https://dgb01p240102.japaneast.cloudapp.azure.com',
    TENANT_UUID: process.env.TENANT_UUID || '2595af81-c151-47eb-9f15-d17e0adbe3b4',
    LOGIN_PATH: process.env.LOGIN_PATH || '/wise/wiseadm/s/subadmin',
    MAX_MESSAGE_LENGTH: process.env.MAX_MESSAGE_LENGTH || '10000',
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '5242880',
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '60000',
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '10',
    SESSION_TIMEOUT: process.env.SESSION_TIMEOUT || '1800000',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'development' 
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://gc.kis.v2.scr.kaspersky-labs.com ws://gc.kis.v2.scr.kaspersky-labs.com"
                : "script-src 'self' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: ws: wss:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // 生產環境優化
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
    compress: true,
  }),
};

export default nextConfig;
