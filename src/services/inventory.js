import api from './api'

export async function listInventoryItems(filters = {}) {
  const params = {}
  if (filters.category) params.category = filters.category
  if (filters.onlyAvailable) params.onlyAvailable = true

  const response = await api.get('/inventory/items', { params })
  return response.data?.items ?? []
}

export async function getInventoryItem(itemId) {
  const response = await api.get(`/inventory/items/${itemId}`)
  return response.data?.item ?? null
}

export async function createInventoryRental(payload) {
  const response = await api.post('/inventory/rentals', payload)
  return response.data?.rental ?? null
}

export async function listMyInventoryRentals() {
  const response = await api.get('/inventory/rentals')
  return response.data?.rentals ?? []
}
