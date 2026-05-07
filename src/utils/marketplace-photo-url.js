/**
 * @file src/utils/marketplace-photo-url.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { getApiOrigin } from './network'

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#x2F;/gi, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function resolveMarketplacePhotoUrl(rawValue) {
  const raw = decodeHtmlEntities(rawValue).trim().replace(/\\/g, '/')

  if (!raw) {
    return ''
  }

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw
  }

  const apiBase = String(import.meta.env.VITE_API_URL || '').trim()

  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const apiOrigin = getApiOrigin()

    return raw.startsWith('/') ? `${apiOrigin}${raw}` : `${apiOrigin}/${raw}`
  }

  if (apiBase.startsWith('/')) {
    if (raw.startsWith(apiBase + '/')) {
      return raw
    }

    return raw.startsWith('/') ? `${apiBase}${raw}` : `${apiBase}/${raw}`
  }

  return raw.startsWith('/') ? raw : `/${raw}`
}
