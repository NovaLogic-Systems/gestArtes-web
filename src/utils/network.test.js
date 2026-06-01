import process from 'node:process'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getApiBaseUrl, getApiOrigin, getSocketUrl } from './network'

describe('network utility', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getApiBaseUrl', () => {
    it('returns /api by default if VITE_API_URL is not set', () => {
      vi.stubEnv('VITE_API_URL', '')
      expect(getApiBaseUrl()).toBe('/api')
      vi.unstubAllEnvs()
    })

    it('returns configured url if set', () => {
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/api')
      expect(getApiBaseUrl()).toBe('https://api.example.com/api')
      vi.unstubAllEnvs()
    })
  })

  describe('getApiOrigin', () => {
    it('extracts origin from full API URL', () => {
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/api')
      expect(getApiOrigin()).toBe('https://api.example.com')
      vi.unstubAllEnvs()
    })
  })

  describe('getSocketUrl', () => {
    it('returns configured socket url if set', () => {
      vi.stubEnv('VITE_SOCKET_URL', 'wss://socket.example.com')
      expect(getSocketUrl()).toBe('wss://socket.example.com')
      vi.unstubAllEnvs()
    })

    it('falls back to getApiOrigin if VITE_SOCKET_URL is not set', () => {
      vi.stubEnv('VITE_SOCKET_URL', '')
      vi.stubEnv('VITE_API_URL', 'https://api.example.com/api')
      expect(getSocketUrl()).toBe('https://api.example.com')
      vi.unstubAllEnvs()
    })
  })
})
