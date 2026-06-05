import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "astro:env/server": path.resolve(rootDir, "src/test/real-api-astro-env-server.ts"),
    },
  },
  test: {
    include: ["**/ai.real-api.test.ts"],
    testTimeout: 15000,
  },
});
