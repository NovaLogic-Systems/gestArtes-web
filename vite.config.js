/**
 * @file vite.config.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

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

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function resolveOptionalPath(value) {
  if (!value) {
    return ''
  }

  return path.resolve(configDir, value)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, '')
  const enableHttps = parseBoolean(env.VITE_ENABLE_HTTPS, false)
  const sslKeyPath = resolveOptionalPath(env.VITE_SSL_KEY_PATH)
  const sslCertPath = resolveOptionalPath(env.VITE_SSL_CERT_PATH)
  const hasSslFiles = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_URL || 'https://localhost:3001'

  const apiTarget = env.VITE_API_URL || 'http://localhost:3001'

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
    },
    server: {
      host: 'localhost',
      https: enableHttps && hasSslFiles
        ? {
            key: fs.readFileSync(sslKeyPath),
            cert: fs.readFileSync(sslCertPath),
          }
        : false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
