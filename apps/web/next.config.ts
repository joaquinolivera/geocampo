import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // All app routes live under /app — matches production same-domain deployment
  // and local dev proxy (landing:3001 → /app/* → web:3002/app/*).
  basePath: '/app',

  // Workspace packages and mapbox-gl must be transpiled from ESM → CJS for webpack.
  transpilePackages: [
    '@geocampo/shared',
    '@geocampo/i18n',
    'mapbox-gl',
    'react-map-gl',
  ],
  webpack: (config, { isServer }) => {
    // mapbox-gl references 'worker_threads' (Node-only) — stub it out for the browser bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      'worker_threads': false,
    };

    // Use a unique chunk loading global so the web app's webpack chunks
    // don't collide with the landing app's chunks when both are served from
    // the same origin (localhost:3001) via the dev proxy.
    if (!isServer) {
      config.output.chunkLoadingGlobal = 'webpackChunkGeoCampoApp';
    }

    return config;
  },
};

export default nextConfig;
