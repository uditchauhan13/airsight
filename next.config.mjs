/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        cesium: 'cesium/Build/CesiumUnminified'
      }
    }
    return config
  },
  
  experimental: {
    esmExternals: false
  }
}

export default nextConfig
