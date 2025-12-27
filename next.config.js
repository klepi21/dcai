/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use custom distDir for local builds, Vercel uses .next by default
  ...(process.env.VERCEL ? {} : { distDir: 'build' }),
  compiler: {
    styledComponents: true
  },
  transpilePackages: ['@multiversx/sdk-dapp-ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tools.multiversx.com',
        pathname: '/assets-cdn/**/tokens/**',
      },
      {
        protocol: 'https',
        hostname: 's2.coinmarketcap.com',
        pathname: '/static/img/coins/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding', {
      bufferutil: 'bufferutil',
      'utf-8-validate': 'utf-8-validate'
    });

    return config;
  }
};

module.exports = nextConfig;
