import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Let friends on the same Wi-Fi open the dev server by its LAN IP.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
