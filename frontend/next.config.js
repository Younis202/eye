/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '*.replit.dev',
    '*.repl.co',
    '*.riker.replit.dev',
    '*.kirk.replit.dev',
  ],
  async rewrites() {
    return [
      { source: '/api/retina/:path*', destination: 'http://localhost:8000/:path*' }
    ]
  }
}
module.exports = nextConfig
