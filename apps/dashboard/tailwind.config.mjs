/** @type {import('tailwindcss').Config} */
import preset from "@ieeeatucsd/config/tailwind";

export default {
  presets: [preset],
  content: [
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    // HeroUI theme paths - support both local Bun hoisting and Docker layouts
    "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
};
