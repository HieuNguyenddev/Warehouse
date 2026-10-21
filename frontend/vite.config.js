import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = mode === "development"
    ? env.VITE_APP_URL || env.VITE_API_BASE_URL || "http://localhost:5252"
    : env.VITE_API_BASE_URL || "https://api.minhhieudev.id.vn";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
