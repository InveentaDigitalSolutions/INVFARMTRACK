import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { powerApps } from "@microsoft/power-apps-vite/plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), powerApps()],
  build: {
    // Inline fonts as data URIs. Served as separate files through the Power
    // Apps player they arrive corrupted — the console reports
    // "OTS parsing error: incorrect file size in WOFF header" — so the faces
    // never render. Embedding them in the CSS removes the fetch entirely.
    assetsInlineLimit: 64 * 1024,
  },
  server: {
    proxy: {
      // Proxy Dataverse API calls to avoid CORS issues in local dev
      '/api/data': {
        target: 'https://org2d99840c.crm.dynamics.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
