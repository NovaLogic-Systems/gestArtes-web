import api from './api'
import { uniqueNames } from '../utils/strings'

const LOCAL_STUDIOS_KEY = 'gestartes:studios:local-draft'
const LOCAL_OPTIONS_KEY = 'gestartes:studios:local-options'

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
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

      return entry?.name || entry?.label || entry?.value || ''
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

function saveLocalJson(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function loadLocalStudios() {
  const parsed = readLocalJson(LOCAL_STUDIOS_KEY, [])
  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.map(formatStudio)
}

function saveLocalStudios(studios) {
  saveLocalJson(LOCAL_STUDIOS_KEY, studios)
}

function loadLocalOptions() {
  const parsed = readLocalJson(LOCAL_OPTIONS_KEY, { formats: [], modalities: [] })

  return {
    formats: formatOptionValues(parsed?.formats),
    modalities: formatOptionValues(parsed?.modalities),
  }
}

function saveLocalOptions(options) {
  saveLocalJson(LOCAL_OPTIONS_KEY, {
    formats: formatOptionValues(options?.formats),
    modalities: formatOptionValues(options?.modalities),
  })
}

function createLocalStudioId(studios) {
  const highest = studios.reduce((maxValue, studio) => {
    const parsed = Number(String(studio.id || '').replace(/\D/g, ''))

    if (!Number.isFinite(parsed)) {
      return maxValue
    }

    return Math.max(maxValue, parsed)
  }, 0)

  return `E${highest + 1}`
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
    try {
      const response = await api.get('/admin/studios')
      const studios = parseStudiosPayload(response.data)
      return studios
    } catch {
      return loadLocalStudios()
    }
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

    try {
      await api.post('/admin/studios', normalized)
      return
    } catch {
      const studios = loadLocalStudios()
      const nextStudio = formatStudio({
        id: createLocalStudioId(studios),
        name: normalized.studioName,
        capacity: normalized.capacity,
        formats: normalized.formats,
        modalities: normalized.modalities,
      })

      saveLocalStudios([nextStudio, ...studios])
    }
  },

  async updateStudio(studioId, payload) {
    const normalized = normalizeStudioPayload(payload)

    try {
      await api.patch(`/admin/studios/${studioId}`, normalized)
      return
    } catch {
      const studios = loadLocalStudios()
      const targetId = String(studioId)

      const updated = studios.map((studio) => {
        if (String(studio.id) !== targetId) {
          return studio
        }

        return formatStudio({
          id: studio.id,
          name: normalized.studioName,
          capacity: normalized.capacity,
          formats: normalized.formats,
          modalities: normalized.modalities,
        })
      })

      saveLocalStudios(updated)
    }
  },

  async deleteStudio(studioId) {
    try {
      await api.delete(`/admin/studios/${studioId}`)
      return
    } catch {
      const targetId = String(studioId)
      const studios = loadLocalStudios()
      saveLocalStudios(studios.filter((studio) => String(studio.id) !== targetId))
    }
  },

  async createStudioOption({ type, name }) {
    const normalizedType = type === 'formats' ? 'formats' : 'modalities'
    const normalizedName = String(name || '').trim()

    if (!normalizedName) {
      throw new Error('Nome inválido.')
    }

    try {
      await api.post('/admin/studios/options', {
        type: normalizedType,
        name: normalizedName,
      })

      return normalizedName
    } catch {
      const options = loadLocalOptions()
      options[normalizedType] = uniqueNames([...(options[normalizedType] || []), normalizedName])
      saveLocalOptions(options)

      return normalizedName
    }
  },
}

export default studioManagementService
