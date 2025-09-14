/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Only apply client-side configurations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false
      }
    }
    
    // Handle external modules that might cause issues
    config.externals = config.externals || []
    config.externals.push({
      'cesium': 'Cesium'
    })
    
    return config
  },
  
  experimental: {
    esmExternals: false
  },
  
  // Disable static optimization for pages using Cesium
  async headers() {
    return [
      {
        source: '/satellite-tracking',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ]
  },
  
  // Transpile specific packages if needed
  transpilePackages: []
}

export default nextConfig
