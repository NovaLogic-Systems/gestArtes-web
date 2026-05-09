/**
 * @file src/services/studentAccount.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'

export async function fetchStudentAccount() {
	const response = await api.get('/student/profile')
	return response.data
}

export async function updateStudentPhoneNumber(phoneNumber) {
	const response = await api.patch('/student/profile', {
		phoneNumber,
	})

	return response.data
}

export async function changeStudentPassword({ currentPassword, newPassword }) {
	const response = await api.post('/student/profile/password', {
		currentPassword,
		newPassword,
	})

	return response.data
}