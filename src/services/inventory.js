/**
 * @file src/services/inventory.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'

export async function listInventoryItems(params = {}) {
	const response = await api.get('/inventory/items', { params })
	return response.data?.items ?? []
}

export async function getInventoryItemById(itemId) {
	const response = await api.get(`/inventory/items/${itemId}`)
	return response.data?.item ?? null
}

export async function createInventoryRental(payload) {
	const response = await api.post('/inventory/rentals', payload)
	return response.data ?? null
}

export async function listInventoryRentals() {
	const response = await api.get('/inventory/rentals')
	return response.data?.rentals ?? []
}
