import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://gradpro.test', // URL của backend Laravel
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
})