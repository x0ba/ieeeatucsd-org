// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

import mdx from "@astrojs/mdx";

import react from "@astrojs/react";

import expressiveCode from "astro-expressive-code";

import node from "@astrojs/node";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [tailwind(), expressiveCode(), react(), icon(), mdx()],

  adapter: node({
    mode: "standalone",
  }),

  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  // Define environment variables that should be available to client components
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      exclude: [
        // Avoid scanning Node-only scripts that contain require/module usage
      ],
    },
  },
});
