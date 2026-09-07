import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Worker-only imports can escape the initial scan. Discovering them during
  // the first upload otherwise triggers a full reload and discards the photo.
  optimizeDeps: {
    include: ['@imgly/background-removal', '@mediapipe/tasks-vision'],
  },
  worker: { format: 'es' },
  server: { headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  } },
  preview: { headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  } },
})
