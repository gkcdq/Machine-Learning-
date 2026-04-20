import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    hmr: {
      protocol: 'wss',   // SSL car ton nginx est en 443 https
      host: 'localhost',
      port: 443,         // le port exposé au browser, pas celui de Vite
      clientPort: 443,
    },
  },
})