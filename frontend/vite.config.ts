// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Any request starting with /api will be forwarded
      '/api': 'http://localhost:3000',
      
      // We still need the /files proxy for downloads
      '/files': 'http://localhost:3000',
     '/ws': {
        target: 'ws://localhost:3000', // Use 'ws' for WebSockets
        ws: true, // This is the magic line that enables WebSocket proxying
      }, 
    }
  }
})