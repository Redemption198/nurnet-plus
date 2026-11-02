import { defineConfig } from "vite-plus";

// Installed agent skills and their state: third-party tooling, not app code
const AGENT_TOOLING = [
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".github/skills/**",
  ".github/agents/**",
  ".github/hooks/**",
  ".impeccable/**",
];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // Large dataset shipped as-is to the client; formatting it would inflate the download.
    // Agent skills are third-party tooling, kept as installed
    ignorePatterns: ["public/nurnet-*.json", ...AGENT_TOOLING],
  },
  lint: {
    ignorePatterns: AGENT_TOOLING,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
