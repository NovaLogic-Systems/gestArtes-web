/**
 * @file src/utils/network.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

function readConfiguredApiUrl() {
  // Em desenvolvimento, usar proxy do Vite para evitar problemas CORS/SSL
  // Em produção, usar URL absoluta do .env
  const configured = String(import.meta.env.VITE_API_URL || '').trim()
  
  if (import.meta.env.MODE === 'development' && configured.startsWith('https://')) {
    return '/api'
  }
  
  return configured || '/api'
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