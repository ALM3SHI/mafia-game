import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce Turbopack/webpack RAM during compilation. ~20-30% saving.
    webpackMemoryOptimizations: true,

    // CRITICAL for the 5 GB crash: rewrites barrel imports like
    //   `import { Users, Crown } from 'lucide-react'`
    // into per-icon module paths so Turbopack only parses what's actually
    // used, instead of the entire 1948-icon barrel. lucide-react is on
    // the default list, but listing it explicitly is safe and ensures it
    // applies regardless of internal version-matching heuristics.
    // framer-motion is NOT in the default list and needs the hint.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
    ],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
