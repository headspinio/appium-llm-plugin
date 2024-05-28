// eslint.config.js
import js from "@eslint/js";

export default [
  js.configs.recommended, {
    languageOptions: {
      globals: {
        process: 'readonly',
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn"
    }
  }
];
