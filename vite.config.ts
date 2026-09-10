import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    // Forces HTTPS for local dev so mobile browsers allow microphone access!
    basicSsl() 
  ],
  server: {
    host: '0.0.0.0', // Allow local network access
    port: 3000,
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
