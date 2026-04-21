import api from './api'

function appendField(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return
  }

  formData.append(key, String(value))
}

function buildFormData(values, file) {
  const formData = new FormData()
  appendField(formData, 'title', values.title)
  appendField(formData, 'description', values.description)
  appendField(formData, 'price', values.price)
  appendField(formData, 'conditionId', values.conditionId)
  appendField(formData, 'categoryId', values.categoryId)
  appendField(formData, 'location', values.location)

  if (file) {
    formData.append('photo', file)
  }

  return formData
}

export async function getMarketplaceOptions() {
  const response = await api.get('/marketplace/options')
  return response.data ?? { categories: [], conditions: [] }
}

export async function listMarketplaceListings(filters = {}) {
  const response = await api.get('/marketplace/listings', { params: filters })
  return response.data?.listings ?? []
}

export async function getMarketplaceListingById(listingId) {
  const response = await api.get(`/marketplace/listings/${listingId}`)
  return response.data?.listing ?? null
}

export async function getMyMarketplaceListings() {
  const response = await api.get('/marketplace/my-listings')
  return response.data?.listings ?? []
}

export async function createMarketplaceListing(values, file) {
  const response = await api.post('/marketplace/listings', buildFormData(values, file), {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data?.listing ?? null
}

export async function updateMarketplaceListing(listingId, values, file) {
  const response = await api.patch(`/marketplace/listings/${listingId}`, buildFormData(values, file), {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data?.listing ?? null
}

export async function deleteMarketplaceListing(listingId) {
  await api.delete(`/marketplace/listings/${listingId}`)
}
