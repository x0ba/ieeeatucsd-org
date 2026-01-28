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
    define: {
      "import.meta.env.VITE_CONVEX_URL": JSON.stringify(
        process.env.VITE_CONVEX_URL || "http://localhost:3210",
      ),
      "import.meta.env.VITE_CONVEX_SITE_URL": JSON.stringify(
        process.env.CONVEX_SITE_URL || "http://localhost:4321",
      ),
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "#convex": "./convex",
        "@convex": "./convex",
      },
    },
  },
  typescript: {
    strict: true,
  },
});
