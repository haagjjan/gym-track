import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});
const webNextConfig = compat.config({
  extends: ["next/core-web-vitals"],
  rules: {
    "@next/next/no-html-link-for-pages": "off"
  },
  settings: {
    next: {
      rootDir: "apps/web/"
    },
    react: {
      version: "19.0.0"
    }
  }
});

const eslintConfig = [
  {
    ignores: [
      "**/.next/**",
      "**/coverage/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "**/node_modules/**",
      "**/out/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...webNextConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
];

export default eslintConfig;
