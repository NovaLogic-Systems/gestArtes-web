/**
 * @file src/services/studioManagementService.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'
import { uniqueNames } from '../utils/strings'

const LOCAL_STUDIOS_KEY = 'gestartes:studios:local-draft'
const LOCAL_OPTIONS_KEY = 'gestartes:studios:local-options'

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry
        }

        if (entry && typeof entry === 'object') {
          return entry.modalityName || entry.name || entry.label || entry.value || ''
        }

        return String(entry || '')
      })
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function formatOptionValues(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return uniqueNames(
    values.map((entry) => {
      if (typeof entry === 'string') {
        return entry
      }

      return entry?.name || entry?.label || entry?.value || entry?.modalityName || ''
    }),
  )
}

function deriveFormatsFromCapacity(capacity) {
  if (!Number.isFinite(capacity) || capacity <= 0) {
    return []
  }

  if (capacity <= 10) {
    return ['Individual', 'Trio']
  }

  if (capacity <= 12) {
    return ['Individual', 'Dueto']
  }

  return ['Individual', 'Ensemble']
}

function formatStudio(studio) {
  const id = studio?.id ?? studio?.StudioID ?? studio?.studioId ?? ''
  const name = String(studio?.name ?? studio?.StudioName ?? studio?.studioName ?? '').trim()
  const capacity = Number(studio?.capacity ?? studio?.Capacity ?? 0) || 0

  const formats = uniqueNames(
    normalizeList(
      studio?.formats
      ?? studio?.formatNames
      ?? studio?.formatsText
      ?? studio?.formatLabel
      ?? deriveFormatsFromCapacity(capacity),
    ),
  )

  const modalities = uniqueNames(
    normalizeList(
      studio?.modalities
      ?? studio?.modalityNames
      ?? studio?.modalitiesText,
    ),
  )

  return {
    id,
    name,
    capacity,
    formats,
    modalities,
    formatsText: formats.join(', '),
    modalitiesText: modalities.join(', '),
  }
}

function normalizeStudioPayload(payload) {
  const name = String(payload?.studioName ?? payload?.name ?? '').trim()
  const capacity = Number(payload?.capacity)
  const formats = uniqueNames(normalizeList(payload?.formats ?? payload?.formatNames))
  const modalities = uniqueNames(
    normalizeList(payload?.modalities ?? payload?.modalityNames),
  )

  return {
    studioName: name,
    capacity,
    formats,
    formatNames: formats,
    modalities,
    modalityNames: modalities,
  }
}

function readLocalJson(key, fallbackValue) {
  if (typeof window === 'undefined') {
    return fallbackValue
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

function loadLocalStudios() {
  const parsed = readLocalJson(LOCAL_STUDIOS_KEY, [])
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.map(formatStudio)
}

function loadLocalOptions() {
  const parsed = readLocalJson(LOCAL_OPTIONS_KEY, { formats: [], modalities: [] })

  return {
    formats: formatOptionValues(parsed?.formats),
    modalities: formatOptionValues(parsed?.modalities),
  }
}

function parseStudiosPayload(data) {
  const entries = Array.isArray(data) ? data : data?.studios

  if (!Array.isArray(entries)) {
    return []
  }

  return entries.map(formatStudio).filter((studio) => studio.name)
}

function parseOptionsPayload(data) {
  const formats = formatOptionValues(
    data?.formats
    ?? data?.availableFormats
    ?? data?.studioFormats,
  )

  const modalities = formatOptionValues(
    data?.modalities
    ?? data?.availableModalities
    ?? data?.studioModalities,
  )

  return {
    formats,
    modalities,
  }
}

function deriveOptionsFromStudios(studios) {
  return {
    formats: uniqueNames(studios.flatMap((studio) => studio.formats)),
    modalities: uniqueNames(studios.flatMap((studio) => studio.modalities)),
  }
}

const studioManagementService = {
  async listStudios() {
    const response = await api.get('/admin/studios')
    return parseStudiosPayload(response.data)
  },

  async listStudioOptions() {
    let backendOptions = { formats: [], modalities: [] }

    try {
      const response = await api.get('/admin/studios/options')
      backendOptions = parseOptionsPayload(response.data)
    } catch {
      backendOptions = { formats: [], modalities: [] }
    }

    const localOptions = loadLocalOptions()
    const localStudios = loadLocalStudios()
    const localStudioOptions = deriveOptionsFromStudios(localStudios)

    return {
      formats: uniqueNames([
        ...backendOptions.formats,
        ...localOptions.formats,
        ...localStudioOptions.formats,
      ]),
      modalities: uniqueNames([
        ...backendOptions.modalities,
        ...localOptions.modalities,
        ...localStudioOptions.modalities,
      ]),
    }
  },

  async createStudio(payload) {
    const normalized = normalizeStudioPayload(payload)
    await api.post('/admin/studios', normalized)
  },

  async updateStudio(studioId, payload) {
    const normalized = normalizeStudioPayload(payload)
    await api.patch(`/admin/studios/${studioId}`, normalized)
  },

  async deleteStudio(studioId) {
    await api.delete(`/admin/studios/${studioId}`)
  },

  async createStudioOption({ type, name }) {
    const normalizedType = type === 'formats' ? 'formats' : 'modalities'
    const normalizedName = String(name || '').trim()

    if (!normalizedName) {
      throw new Error('Nome inválido.')
    }

    await api.post('/admin/studios/options', {
      type: normalizedType,
      name: normalizedName,
    })

    return normalizedName
  },
}

export default studioManagementService
