const withTM = require("next-transpile-modules")(["cesium"]);

module.exports = withTM({
  transpilePackages: ["cesium"],
  experimental: { esmExternals: false },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false, crypto: false, stream: false, zlib: false };
    }
    return config;
  },
});
