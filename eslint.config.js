import globals from "globals";
import js from "@eslint/js";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
];
