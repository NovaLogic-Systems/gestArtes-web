import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  function loadHttps() {
    const keyPath = env.VITE_SSL_KEY_PATH
    const certPath = env.VITE_SSL_CERT_PATH
    if (!keyPath || !certPath) return undefined
    try {
      return {
        key: fs.readFileSync(path.resolve(process.cwd(), keyPath)),
        cert: fs.readFileSync(path.resolve(process.cwd(), certPath)),
      }
    } catch {
      console.warn('[vite] SSL certs not found; running without HTTPS')
      return undefined
    }
  }

  return {
    plugins: [react()],
    server: {
      https: loadHttps(),
      proxy: {
        '^/api(/.*)?$': {
          target: env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})