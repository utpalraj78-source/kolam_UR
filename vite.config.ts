import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
    hmr: {
      host: 'localhost',
    },
    proxy: {
      "/generate": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/lookup-image-config": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/matrix": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/simulate": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/decode": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/kolam": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/kolam-preview": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/kolam-animation": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/list-generated-kolams": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/register-kolam": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/generate-from-image-mapping": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/generated-images": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/transmit-single-hop": {
        target: "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@features": path.resolve(__dirname, "./features"),
    },
  },
}));
