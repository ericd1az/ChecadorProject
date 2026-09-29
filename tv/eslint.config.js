const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['android/**', 'ios/**', 'dist/**'],
    rules: {
      // The TV app deliberately resets state when a remote subscription/identity changes.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
