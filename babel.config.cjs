module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      'nativewind/babel',
    ],
    plugins: [
      ['module-resolver', {
        root: ['.'],                // корень проекта
        alias: { '@': './' },       // если utils в корне
        // alias: { '@': './src' },  // если utils в src/
        extensions: ['.tsx', '.ts', '.js', '.json'],
      }],
      // если используете expo-router, можете добавить 'expo-router/babel'
    ],
  };
};