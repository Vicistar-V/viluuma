import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: mode === 'development' ? [] : [],
      output: {
        globals: {
          '@capacitor/core': 'CapacitorCore',
          '@capacitor/local-notifications': 'CapacitorLocalNotifications'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@capacitor/core', '@capacitor/local-notifications']
  }
}));
