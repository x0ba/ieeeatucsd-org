// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

import mdx from "@astrojs/mdx";

import react from "@astrojs/react";

import expressiveCode from "astro-expressive-code";

import node from "@astrojs/node";

import icon from "astro-icon";

import sitemap from "@astrojs/sitemap";

import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://ieeeatucsd.org",
  output: "server",
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    expressiveCode(),
    react(),
    icon(),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/dashboard/") &&
        !page.includes("/api/") &&
        !page.includes("/accept-invitation/"),
    }),
    AstroPWA({
      mode: "production",
      base: "/dashboard/",
      scope: "/dashboard/",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],
      registerType: "autoUpdate",
      manifest: false, // Use custom manifest at /dashboard/manifest.json
      injectManifest: {
        globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2}"],
      },
      workbox: {
        navigateFallback: "/dashboard/offline",
        navigateFallbackAllowlist: [/^\/dashboard\/.*/],
        navigateFallbackDenylist: [/^\/dashboard\/api\/.*/],
        globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2}"],
        // Only cache dashboard routes
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/code\.iconify\.design\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "iconify-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/dashboard\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "dashboard-images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /\/dashboard\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "dashboard-api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/dashboard\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "dashboard-pages-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        navigateFallbackAllowlist: [/^\/dashboard\/.*/],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
  ],

  adapter: node({
    mode: "standalone",
  }),

  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  // Define environment variables that should be available to client components
  vite: {
    define: {
      // Firebase client config
      "import.meta.env.PUBLIC_FIREBASE_WEB_API_KEY": JSON.stringify(
        process.env.PUBLIC_FIREBASE_WEB_API_KEY,
      ),
      "import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN": JSON.stringify(
        process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      ),
      "import.meta.env.PUBLIC_FIREBASE_PROJECT_ID": JSON.stringify(
        process.env.PUBLIC_FIREBASE_PROJECT_ID,
      ),
      "import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET": JSON.stringify(
        process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      ),
      "import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
        process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      ),
      "import.meta.env.PUBLIC_FIREBASE_APP_ID": JSON.stringify(
        process.env.PUBLIC_FIREBASE_APP_ID,
      ),
    },
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
