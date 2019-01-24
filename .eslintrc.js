"use strict";

module.exports = {
  extends: ["eslint:recommended", "plugin:jest/recommended", "prettier"],
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      files: "**/*.js",
      env: {
        node: true,
        es6: true
      }
    },
    {
      files: "**/*.ts",
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module"
      },
      env: {
        node: true,
        es6: true
      },
      rules: {
        "@typescript-eslint/no-unused-vars": "error",
        "no-unused-vars": "off"
      }
    }
  ]
};
