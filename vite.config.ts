import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./scripts/vite/sites-vite-plugin";
import { configureToolEnvironment } from "./scripts/tool-environment.mjs";
export default defineConfig(async () => {
  configureToolEnvironment(process.cwd());
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
    plugins: [vinext(), sites({ mockAuth: false }), cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false, configPath: "./wrangler.jsonc",
    })],
  };
});
