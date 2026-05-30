// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_SUPABASE_URL: envField.string({ context: "client", access: "public", optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: "client", access: "public", optional: true }),
      OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      GITHUB_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
      GITHUB_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      GITLAB_CLIENT_ID: envField.string({ context: "server", access: "secret", optional: true }),
      GITLAB_CLIENT_SECRET: envField.string({ context: "server", access: "secret", optional: true }),
      GITHUB_OAUTH_REDIRECT_URL: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
