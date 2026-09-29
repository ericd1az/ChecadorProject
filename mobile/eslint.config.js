// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    // Los efectos de estas pantallas disparan lecturas asíncronas de Supabase.
    // El compilador confunde la llamada a la función async con una actualización síncrona.
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  }
]);
