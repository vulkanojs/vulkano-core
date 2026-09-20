import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    singleQuote: true,
    trailingComma: "none",
    ignorePatterns: [
      ".claude/**",
      ".graphify/**",
      ".vite-hooks/**",
      "test/**",
      "bundle/**",
      "tasks/**",
      "docs/**",
      "public/**",
      "setup/**"
    ],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true
    },
    env: {
      node: true,
      browser: true,
      es6: true,
    },
    globals: {
      app: "readonly",
      io: "readonly",
      ApiClient: "readonly",
      Download: "readonly",
      Paginate: "readonly",
      Mixed: "readonly",
      Crontab: "readonly",
      Encrypter: "readonly",
      Filter: "readonly",
      i18n: "readonly",
      Jwt: "readonly",
      VSError: "readonly",
      ABS_PATH: "readonly",
      APP_PATH: "readonly",
      CORE_PATH: "readonly",
      PUBLIC_PATH: "readonly",
    },
    rules: {
      curly: "error",
      // Plain-JS codebase: type inference flags option-object spreads and
      // destructured plain functions (false positives).
      "typescript/no-misused-spread": "off",
      "typescript/unbound-method": "off",
      "no-console": "off",
      "no-underscore-dangle": "off",
      "no-throw-literal": "off",
      "no-unneeded-ternary": "off",
      "guard-for-in": "off",
      "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    },
    ignorePatterns: [
      ".claude",
      ".graphify",
      ".vite-hooks",
      "node_modules",
      "test",
      "bundle",
      "tasks",
      "docs",
      "public",
      "setup"
    ],
  },
});
