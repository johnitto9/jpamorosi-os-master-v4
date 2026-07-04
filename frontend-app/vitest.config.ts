import { defineConfig } from "vitest/config";
import path from "node:path";

// Enables `@/...` path alias (matches tsconfig) for tests.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
  },
});
