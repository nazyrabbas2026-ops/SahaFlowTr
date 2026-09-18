import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      // Smoke paketinin ayrı build çıktısı (bkz. playwright.smoke.config.ts).
      "**/.next-smoke/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
);
