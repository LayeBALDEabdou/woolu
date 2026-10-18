import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Le code de production ne doit jamais dépendre des mocks : seul le registre de services
    // (src/lib/services) a le droit de brancher l'implémentation de démonstration.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/mocks/**", "src/lib/services/**", "src/**/*.test.{ts,tsx}", "src/tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/mocks/*"], message: "Passez par useServices() au lieu d'importer les mocks." }] },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
])

export default eslintConfig
