/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'build',
  compiler: {
    styledComponents: true
  },
  transpilePackages: ['@multiversx/sdk-dapp-ui'],
  eslint: {
    ignoreDuringBuilds: true,
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
