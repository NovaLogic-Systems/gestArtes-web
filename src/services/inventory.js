/**
 * @file src/services/inventory.js
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

function buildInventoryPayload(values) {
	const payload = {}
	appendField(payload, 'itemName', values.itemName)
	appendField(payload, 'description', values.description)
	appendField(payload, 'symbolicFee', values.symbolicFee)
	appendField(payload, 'categoryId', values.categoryId)
	appendField(payload, 'categoryName', values.categoryName)
	appendField(payload, 'totalQuantity', values.totalQuantity)
	appendField(payload, 'photoUrl', values.photoUrl)
	return payload
}

function buildInventoryMultipartPayload(values, file) {
	const formData = new FormData()
	appendFieldToFormData(formData, 'itemName', values.itemName)
	appendFieldToFormData(formData, 'description', values.description)
	appendFieldToFormData(formData, 'symbolicFee', values.symbolicFee)
	appendFieldToFormData(formData, 'categoryId', values.categoryId)
	appendFieldToFormData(formData, 'categoryName', values.categoryName)
	appendFieldToFormData(formData, 'totalQuantity', values.totalQuantity)

	if (file) {
		formData.append('photo', file)
	}

	return formData
}

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

export async function verifyInventoryReturn(rentalId, payload) {
	const response = await api.patch(`/admin/inventory/rentals/${rentalId}/verify-return`, payload)
	return response.data ?? null
}

export async function rejectInventoryReturn(rentalId, payload) {
  const response = await api.patch(`/admin/inventory/rentals/${rentalId}/reject-return`, payload)
  return response.data ?? null
}

export async function listAdminInventoryItems(params = {}) {
	const response = await api.get('/admin/inventory', { params })
	return response.data?.items ?? []
}

export async function listAdminInventoryRentals() {
	const response = await api.get('/admin/inventory/rentals')
	return response.data?.rentals ?? []
}

export async function approveInventoryRental(rentalId, payload) {
	const response = await api.patch(`/admin/inventory/rentals/${rentalId}/approve`, payload)
	return response.data ?? null
}

export async function createInventoryItem(values, file) {
	const hasFile = Boolean(file)
	const payload = hasFile ? buildInventoryMultipartPayload(values, file) : buildInventoryPayload(values)
	const response = await api.post('/admin/inventory', payload, hasFile ? {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	} : undefined)
	return response.data?.item ?? null
}

export async function updateInventoryItem(itemId, values, file) {
	const hasFile = Boolean(file)
	const payload = hasFile ? buildInventoryMultipartPayload(values, file) : buildInventoryPayload(values)
	const response = await api.patch(`/admin/inventory/${itemId}`, payload, hasFile ? {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
	} : undefined)
	return response.data?.item ?? null
}

export async function deleteInventoryItem(itemId) {
	const response = await api.delete(`/admin/inventory/${itemId}`)
	return response.data ?? null
}
