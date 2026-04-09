import { fileURLToPath } from 'url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url))
  const rootEnv = loadEnv(mode, repoRoot, '')
  const backendPort = rootEnv.PORT || '3000'
  const backendTarget = `http://localhost:${backendPort}`

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendTarget,
          ws: true,
        },
      },
    },
  }
})
