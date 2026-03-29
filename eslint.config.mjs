import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      ".astro",
      "output",
      "img",
      "references",
      ".playwright-cli",
      "data",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.{tsx,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  eslintConfigPrettier,
];
