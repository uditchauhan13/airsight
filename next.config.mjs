/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Cesium configuration
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }
    
    // Handle Cesium
    config.resolve.alias = {
      ...config.resolve.alias,
      cesium: 'cesium/Build/CesiumUnminified'
    }
    
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/cesium/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    })
    
    return config
  },
  
  experimental: {
    esmExternals: false
  }
}

export default nextConfig
