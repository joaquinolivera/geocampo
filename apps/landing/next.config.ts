import type { NextConfig } from 'next';

// In development the web app runs on :3002 with basePath /app.
// The landing (on :3001) proxies /app/* to the web app so both
// appear on the same origin — mirroring production same-domain deployment.
const WEB_APP_URL = process.env.WEB_APP_INTERNAL_URL ?? 'http://localhost:3002';

const config: NextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // Proxy the app root
      {
        source:      '/app',
        destination: `${WEB_APP_URL}/app`,
      },
      // Proxy everything under /app/ (pages, API routes, _next assets)
      {
        source:      '/app/:path*',
        destination: `${WEB_APP_URL}/app/:path*`,
      },
    ];
  },
};

export default config;
