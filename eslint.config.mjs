import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

const nextRootDir = process.cwd().endsWith("apps\\web")
  ? "."
  : process.cwd().endsWith("apps/web")
    ? "."
    : "apps/web";

const nextCoreWebVitalsConfig = {
  ...nextPlugin.flatConfig.coreWebVitals,
  files: [
    "apps/web/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{js,jsx,ts,tsx}",
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "tests/**/*.{js,jsx,ts,tsx}",
  ],
  settings: {
    next: {
      rootDir: nextRootDir,
    },
  },
};

const nextPluginDetectionConfig = {
  files: [
    "eslint.config.mjs",
    "apps/web/eslint.config.mjs",
  ],
  plugins: {
    "@next/next": nextPlugin,
  },
  settings: {
    next: {
      rootDir: nextRootDir,
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "**/*.d.ts",
      "**/*.d.ts.map",
      "packages/**/src/**/*.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  nextPluginDetectionConfig,
  nextCoreWebVitalsConfig,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
        },
      ],
    },
  },
);
