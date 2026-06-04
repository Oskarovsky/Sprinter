import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "astro:env/server": path.resolve(rootDir, "src/test/mocks/astro-env-server.ts"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text"],
    },
  },
});
