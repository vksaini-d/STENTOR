import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Allow local network access
    port: 3000,
    https: {
      key: fs.readFileSync('./.cert/key.pem'),
      cert: fs.readFileSync('./.cert/cert.pem'),
    },
    proxy: {
      // Proxy API requests to our Node.js token server
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // Proxy Arch 1 WebSocket connections
      '/arch1-ws': {
        target: 'ws://127.0.0.1:3002',
        ws: true,
        changeOrigin: true
      },
      // Proxy LiveKit WebSocket connections to avoid Mixed Content errors on HTTPS
      '/livekit': {
        target: 'http://127.0.0.1:7880',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/livekit/, '')
      }
    }
  }
})
