/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor offline bundle (app opens from local files, works in flight mode)
  ...(process.env.BUILD_FOR_CAPACITOR === '1' ? { output: 'export', images: { unoptimized: true } } : {}),
}

module.exports = nextConfig
