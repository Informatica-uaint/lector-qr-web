/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  experimental: {
    esmExternals: false,
  },
  // Exponer variables de entorno al runtime del browser
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  }
}

module.exports = nextConfig