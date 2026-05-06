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

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableHttps = parseBoolean(
    env.VITE_ENABLE_HTTPS,
    Boolean(env.VITE_SSL_KEY_PATH && env.VITE_SSL_CERT_PATH),
  )

  function loadHttps() {
    if (!enableHttps) return undefined

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
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/socket.io': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})