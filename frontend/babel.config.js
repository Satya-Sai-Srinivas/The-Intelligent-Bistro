module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      // Reanimated/worklets plugin is auto-injected by babel-preset-expo — do not add it here.
      plugins: ['nativewind/babel'],
    };
  };