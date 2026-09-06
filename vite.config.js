import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import localDbPlugin from './plugins/vite-plugin-local-db.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), localDbPlugin()],
  server: {
    port: 5176,
    strictPort: true,
  },
})
