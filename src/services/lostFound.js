/**
 * @file src/services/lostFound.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api'

export async function listLostFoundItems() {
	const response = await api.get('/lostfound')
	return response.data ?? []
}