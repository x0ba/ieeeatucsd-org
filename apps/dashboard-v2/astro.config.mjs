import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://ieeeatucsd.org",
  output: "server",
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
  typescript: {
    strict: true,
  },
});
