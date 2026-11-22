import { defineConfig } from "vitest/config";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local into process.env for tests, so the user does not need to
// set shell variables. Existing shell variables win over the file.
const envPath = resolve(__dirname, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2];
    }
  }
}

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
});
