module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:storybook/recommended",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "react-hooks", "@typescript-eslint", "react-refresh"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/no-empty-function": "off",
    "no-constant-condition": "warn",
    "react/prop-types": "off",
    "react-refresh/only-export-components": "warn",
  },
  ignorePatterns: [
    "storybook-static",
    "dist",
    "*.config.js",
    "*.config.ts",
    ".eslintrc.js",
  ],
};
