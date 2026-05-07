/**
 * @file src/services/marketplace.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'

function appendField(payload, key, value) {
  if (value === undefined || value === null || value === '') {
    return
  }

  payload[key] = value
}

function appendFieldToFormData(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return
  }

  formData.append(key, String(value))
}

function buildPayload(values) {
  const payload = {}
  appendField(payload, 'title', values.title)
  appendField(payload, 'description', values.description)
  appendField(payload, 'price', values.price)
  appendField(payload, 'conditionId', values.conditionId)
  appendField(payload, 'categoryId', values.categoryId)
  appendField(payload, 'location', values.location)
  appendField(payload, 'photoUrl', values.photoUrl)
  return payload
}

function buildMultipartPayload(values, file) {
  const formData = new FormData()
  appendFieldToFormData(formData, 'title', values.title)
  appendFieldToFormData(formData, 'description', values.description)
  appendFieldToFormData(formData, 'price', values.price)
  appendFieldToFormData(formData, 'conditionId', values.conditionId)
  appendFieldToFormData(formData, 'categoryId', values.categoryId)
  appendFieldToFormData(formData, 'location', values.location)

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
  const hasFile = Boolean(file)
  const payload = hasFile ? buildMultipartPayload(values, file) : buildPayload(values)
  const response = await api.post('/marketplace/listings', payload, hasFile ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined)

  return response.data?.listing ?? null
}

export async function updateMarketplaceListing(listingId, values, file) {
  const hasFile = Boolean(file)
  const payload = hasFile ? buildMultipartPayload(values, file) : buildPayload(values)
  const response = await api.patch(`/marketplace/listings/${listingId}`, payload, hasFile ? {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  } : undefined)

  return response.data?.listing ?? null
}

export async function deleteMarketplaceListing(listingId) {
  await api.delete(`/marketplace/listings/${listingId}`)
}
