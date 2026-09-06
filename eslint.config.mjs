import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Base config for the workspace packages (`packages/*`). The Next apps have
 * their own `eslint.config.mjs` that extends `eslint-config-next`.
 */
export default tseslint.config(
  {
    ignores: ["**/.next/**", "**/dist/**", "**/node_modules/**", "apps/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { process: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
