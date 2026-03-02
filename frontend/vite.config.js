import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      // Proxy all /api calls to the FastAPI backend
      // In docker, the backend service is reachable via its service name "web"
      "/emails": { target: "http://web:8000", changeOrigin: true },
      "/fetch_order_details": { target: "http://web:8000", changeOrigin: true },
      "/fetch_customer_details": { target: "http://web:8000", changeOrigin: true },
      "/refund_order": { target: "http://web:8000", changeOrigin: true },
    },
  },
});