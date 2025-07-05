/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ⬇️ дозволяємо зовнішні картинки
  images: {
    // швидкий whitelist одного домену
    domains: ['i.ibb.co', 'files.catbox.moe'],

    // або гнучкіший варіант через remotePatterns
    /* remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        pathname: '/**',     // усі шляхи
      },
      // якщо треба, додайте інші gateway
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**',
      },
    ], */
  },

  // ваша поточна конфігурація вебпака
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;
