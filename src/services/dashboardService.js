/**
 * @file src/services/dashboardService.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import api from './api';

const dashboardService = {
  /**
   * Obtém o snapshot do painel administrativo
   * @returns {Promise<Object>}
   */
  async getSnapshot() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  /**
   * Publica um aviso geral para todos os utilizadores via WebSockets
   * @param {Object} payload
   * @param {string} payload.title
   * @param {string} payload.message
   * @returns {Promise<Object>}
   */
  async publishNotice(payload) {
    const response = await api.post('/admin/notifications/broadcast', payload);
    return response.data;
  },

  /**
   * Gera um resumo operacional em formato de tabela
   * @returns {Promise<Object>}
   */
  async getOperationalSummary() {
    const response = await api.get('/admin/dashboard/operational-summary');
    return response.data;
  }
};

export default dashboardService;
