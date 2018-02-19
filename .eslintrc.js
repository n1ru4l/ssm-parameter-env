"use strict";

module.exports = {
  parserOptions: {
    ecmaVersion: 6
  },
  env: {
    node: true,
    es6: true
  },
  extends: ["eslint:recommended", "prettier", "plugin:jest/recommended"],
  overrides: [
    {
      files: "**/*.test.js",
      env: {
        "jest/globals": true
      }
    }
  ]
};
