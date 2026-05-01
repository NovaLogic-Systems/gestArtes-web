/**
 * @file src/utils/network.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

function readConfiguredApiUrl() {
  return String(import.meta.env.VITE_API_URL || '/api').trim() || '/api'
}

export function getApiBaseUrl() {
  return readConfiguredApiUrl()
}

export function getApiOrigin() {
  const apiBaseUrl = getApiBaseUrl()

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/i, '')
  }

  if (apiBaseUrl.startsWith('/')) {
    return typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
  }

  return apiBaseUrl.replace(/\/api\/?$/i, '')
}

export function getSocketUrl() {
  const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || '').trim()

  if (configuredSocketUrl) {
    return configuredSocketUrl
  }

  return getApiOrigin()
}