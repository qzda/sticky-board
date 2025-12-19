import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          dep: ["interactjs", "markdown-it"],
        },
      },
    },
  },
});
