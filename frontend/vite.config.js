import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/process': 'http://127.0.0.1:5000',
      '/chat': 'http://127.0.0.1:5000',
      '/transcript': 'http://127.0.0.1:5000'
    }
  }
})
