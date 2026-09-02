/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
