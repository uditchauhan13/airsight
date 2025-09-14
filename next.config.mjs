// next.config.mjs
import withTM from "next-transpile-modules"

/** @type {import('next').NextConfig} */
const nextConfig = withTM({
  transpileModules: ["cesium"],
  experimental: {
    esmExternals: false
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallbacks for Node modules Cesium uses
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false
      }
    }
    return config
  }
})

export default nextConfig
