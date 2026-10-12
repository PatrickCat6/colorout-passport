/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/viewingroom',
        destination: '/viewingroom.html',
      },
    ];
  },
}

module.exports = nextConfig
