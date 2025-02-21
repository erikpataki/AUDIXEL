module.exports = function override(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "path": require.resolve("path-browserify"),
      "fs": false,
      "buffer": require.resolve("buffer/"),
    };
    return config;
  }