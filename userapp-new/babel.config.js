// The Expo preset already adds the plugin of the animation engine: it is NOT listed here
// (listing it twice can break the worklets).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
