import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

function resolveOptionalPath(value) {
  if (!value) {
    return ''
  }

  return path.resolve(configDir, value)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, '')
  const enableHttps = parseBoolean(env.VITE_ENABLE_HTTPS, false)
  const sslKeyPath = resolveOptionalPath(env.VITE_SSL_KEY_PATH)
  const sslCertPath = resolveOptionalPath(env.VITE_SSL_CERT_PATH)
  const hasSslFiles = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'https://localhost:3001'

  return {
    plugins: [react()],
    server: {
      host: 'localhost',
      https: enableHttps && hasSslFiles
        ? {
            key: fs.readFileSync(sslKeyPath),
            cert: fs.readFileSync(sslCertPath),
          }
        : false,
      proxy: {
        '^/api(/.*)?$': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/socket.io': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
