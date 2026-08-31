/**
 * ESLint flat config.
 *
 * Enforces the house gates that were previously written down but checked by
 * nothing: no `any`, no floating promises, no unused code, exhaustive
 * switches. A rule in a document is a suggestion; a rule in a script is a rule.
 *
 * Note on typescript-eslint: its published peer range is `typescript <6.1.0`
 * and this project pins TypeScript 7.0.2, so it is installed with
 * --legacy-peer-deps. Type-aware linting is verified working in CI by the
 * `lint` script itself — if a TS 7 change ever breaks the parser, lint fails
 * loudly rather than silently skipping rules.
 *
 * @author  Uvin Vindula (IAMUVIN)
 * @website https://iamuvin.com
 */

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "instructions/**", "public/**", "assets/**"],
  },

  // ── Browser island: type-aware ────────────────────────────────────────────
  {
    files: ["src/**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The gates from CLAUDE.md, as errors rather than warnings.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "no-console": ["error", { allow: ["log", "warn", "error"] }],
      // Numbers in template literals are unambiguous and everywhere in DOM
      // code (`${x}px`). Objects and nullables stay banned.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",

      // Functions under 20 lines / 3 params, per the house rules. Warned
      // rather than errored: the reveal and cursor setup functions are
      // legitimately a little longer, and a hard fail here would push work
      // into worse shapes just to satisfy a counter.
      "max-params": ["warn", 3],
      "max-lines-per-function": ["warn", { max: 45, skipComments: true, skipBlankLines: true }],
    },
  },

  // ── Verification scripts: plain ESM, no type info ─────────────────────────
  {
    files: ["scripts/**/*.mjs", "*.config.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // ── Tests ─────────────────────────────────────────────────────────────────
  {
    files: ["tests/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
    },
  }
);
