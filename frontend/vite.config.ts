import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const page = (name: string) => fileURLToPath(new URL(`./${name}`, import.meta.url));

// /api -> FastAPI на порту 8000 (чтобы frontend не знал адрес сервера).
// build.rollupOptions.input: какие страницы попадают в сборку для хостинга.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
  build: {
    rollupOptions: {
      input: { main: page("index.html"), cogniva: page("cogniva.html") },
    },
  },
});