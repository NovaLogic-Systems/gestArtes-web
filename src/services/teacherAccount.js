/**
 * @file src/services/teacherAccount.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'

export async function fetchTeacherAccount() {
	const response = await api.get('/teacher/profile')
	return response.data
}

export async function updateTeacherPhoneNumber(phoneNumber) {
	const response = await api.patch('/teacher/profile', { phoneNumber })
	return response.data
}

export async function changeTeacherPassword({ currentPassword, newPassword }) {
	const response = await api.post('/teacher/profile/password', {
		currentPassword,
		newPassword,
	})
	return response.data
}
