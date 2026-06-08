import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages and mapbox-gl must be transpiled from ESM → CJS for webpack.
  transpilePackages: [
    '@geocampo/shared',
    '@geocampo/i18n',
    'mapbox-gl',
  ],
  webpack: (config) => {
    // mapbox-gl references 'worker_threads' (Node-only) — stub it out for the browser bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      'worker_threads': false,
    };
    return config;
  },
};

export default nextConfig;
