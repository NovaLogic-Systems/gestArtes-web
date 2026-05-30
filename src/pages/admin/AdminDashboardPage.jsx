/**
 * @file src/pages/admin/AdminDashboardPage.jsx
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import AdminShell from './AdminShell';
import dashboardService from '../../services/dashboardService';
import { useAuth } from '../../hooks/useAuth';
import './dashboard.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ADMIN_DASHBOARD_SOCKET_EVENT = 'admin:dashboard:update';
const NOTIFICATION_TYPES = [
  { value: 'system', label: 'Sistema' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'schedule', label: 'Agenda' },
  { value: 'penalty', label: 'Penalização' },
  { value: 'join_request', label: 'Pedidos de adesão' },
];

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState({ title: '', message: '', targetRole: 'all', type: 'system' });

  const fetchSnapshot = useCallback(async () => {
    try {
      const data = await dashboardService.getSnapshot();
      setSnapshot(data);
    } catch (error) {
      console.error('Error fetching dashboard snapshot:', error);
      toast.error('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { accessToken: token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to dashboard socket');
    });

    newSocket.on(ADMIN_DASHBOARD_SOCKET_EVENT, (data) => {
      console.log('Real-time dashboard update received');
      setSnapshot(data);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (!notice.title.trim() || !notice.message.trim()) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }

    setPublishing(true);
    try {
      await dashboardService.publishNotice(notice);
      toast.success('Aviso publicado com sucesso!');
      setNotice({ title: '', message: '', targetRole: 'all', type: 'system' });
      fetchSnapshot(); // Refresh notices list
    } catch (error) {
      console.error('Error publishing notice:', error);
      toast.error('Erro ao publicar aviso.');
    } finally {
      setPublishing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981'; // Green
      case 'low_usage': return '#3b82f6'; // Blue
      case 'stable': return '#f59e0b'; // Amber
      case 'near_full': return '#ef4444'; // Red
      default: return '#9ca3af'; // Gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Livre';
      case 'low_usage': return 'Uso Baixo';
      case 'stable': return 'Estável';
      case 'near_full': return 'Quase Cheio';
      default: return 'Desconhecido';
    }
  };

  return (
    <AdminShell 
      title="Painel de Administração" 
      activePath="/admin/dashboard"
    >
      <div className="admin-dashboard-content">
        <section className="content-grid">
          {/* KPI Section */}
          <div className="kpi-grid">
            <div className="kpi" style={{ background: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', border: '1px solid #e2d9eb', borderRadius: '12px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#4c4666', fontWeight: 600 }}>Pedidos Pendentes</h3>
              <strong style={{ display: 'block', marginTop: '8px', fontSize: '1.7rem', color: '#08786d', fontWeight: 700 }}>{snapshot?.kpis?.pendingRequests || 0}</strong>
            </div>
            <div className="kpi" style={{ background: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', border: '1px solid #e2d9eb', borderRadius: '12px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#4c4666', fontWeight: 600 }}>Validações Pendentes</h3>
              <strong style={{ display: 'block', marginTop: '8px', fontSize: '1.7rem', color: '#08786d', fontWeight: 700 }}>{snapshot?.kpis?.pendingValidations || 0}</strong>
            </div>
            <div className="kpi" style={{ background: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', border: '1px solid #e2d9eb', borderRadius: '12px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#4c4666', fontWeight: 600 }}>Submissões Pendentes</h3>
              <strong style={{ display: 'block', marginTop: '8px', fontSize: '1.7rem', color: '#08786d', fontWeight: 700 }}>{snapshot?.kpis?.pendingSubmissions || 0}</strong>
            </div>
            <div className="kpi" style={{ background: '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', border: '1px solid #e2d9eb', borderRadius: '12px', padding: '12px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '0.88rem', color: '#4c4666', fontWeight: 600 }}>Receita Mensal</h3>
              <strong style={{ display: 'block', marginTop: '8px', fontSize: '1.7rem', color: '#08786d', fontWeight: 700 }}>{snapshot?.kpis?.monthlyRevenue || 0}€</strong>
            </div>
          </div>

          <div className="split">
            {/* Real-time Heatmap */}
            <article className="panel heatmap-panel">
              <div className="panel-header-with-badge">
                <h3>Mapa de Ocupação dos Estúdios</h3>
                <span className="live-badge">
                  <span className="pulse-dot"></span> Direto
                </span>
              </div>
              <div className="heatmap-grid">
                {snapshot?.studioOccupancyHeatmap?.map((studio) => (
                  <div key={studio.studioId} className="studio-card-simple">
                    <div className="studio-info-row">
                      <span className="studio-name">{studio.studioName}</span>
                      <span className="studio-count">{studio.enrolledStudents}/{studio.capacity}</span>
                    </div>
                    <div className="occupancy-progress">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${studio.occupancyPercentage}%`,
                          backgroundColor: getStatusColor(studio.status)
                        }}
                      ></div>
                    </div>
                    <div className="studio-status-label" style={{ color: getStatusColor(studio.status) }}>
                      {getStatusLabel(studio.status)} ({studio.occupancyPercentage}%)
                    </div>
                  </div>
                ))}
                {(!snapshot?.studioOccupancyHeatmap || snapshot.studioOccupancyHeatmap.length === 0) && !loading && (
                  <p className="empty-state">Sem dados de ocupação disponíveis.</p>
                )}
              </div>
            </article>

            {/* Side Column: Actions & Notices */}
            <div className="side-panels">
              {/* Quick Actions */}
              <article className="panel">
                <h3>Ações Rápidas</h3>
                <div className="quick-actions-list">
                  <Link className="cta" to="/admin/validations">Fila de Validação</Link>
                  <Link className="cta" to="/admin/users">Utilizadores</Link>
                  <Link className="cta secondary" to="/admin/finance">Exportar CSV Financeiro</Link>
                  <Link className="cta secondary" to="/admin/studio-occupancy">Ocupação dos Estúdios</Link>
                  <Link className="cta secondary" to="/admin/inventory">Inventário</Link>
                  <Link className="cta secondary" to="/admin/lost-and-found">Perdidos e Achados</Link>
                </div>
              </article>

              {/* Publish Notice Form */}
              <article className="panel">
                <h3>Publicar Aviso Geral</h3>
                <form onSubmit={handlePublishNotice} className="admin-notice-form">
                  <input 
                    type="text" 
                    placeholder="Título do aviso..." 
                    value={notice.title}
                    onChange={(e) => setNotice({ ...notice, title: e.target.value })}
                    required
                  />
                  <textarea 
                    placeholder="Mensagem para os utilizadores..." 
                    value={notice.message}
                    onChange={(e) => setNotice({ ...notice, message: e.target.value })}
                    required
                  ></textarea>

                  <select
                    aria-label="Tipo de notificação"
                    value={notice.type}
                    onChange={(e) => setNotice({ ...notice, type: e.target.value })}
                  >
                    {NOTIFICATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select 
                    value={notice.targetRole}
                    onChange={(e) => setNotice({ ...notice, targetRole: e.target.value })}
                  >
                    <option value="all">Todos os utilizadores</option>
                    <option value="students">Apenas Alunos</option>
                    <option value="teachers">Apenas Professores</option>
                  </select>
                  <button type="submit" className="cta" disabled={publishing}>
                    {publishing ? 'A publicar...' : 'Enviar Notificação'}
                  </button>
                </form>
              </article>
            </div>
          </div>

          {/* Management Notices Block */}
          <article className="panel">
            <h3>Comunicações Internas / Avisos de Gestão</h3>
            <div className="notices-list-simple">
              {snapshot?.managementNotices?.map((notice) => (
                <div key={notice.notificationId} className="notice-row">
                  <div className="notice-date-tag">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </div>
                  <div className="notice-body">
                    <strong>{notice.title}</strong>
                    <p>{notice.message}</p>
                  </div>
                </div>
              ))}
              {(!snapshot?.managementNotices || snapshot.managementNotices.length === 0) && (
                <p className="empty-state">Sem avisos recentes.</p>
              )}
            </div>
          </article>
        </section>
      </div>

    </AdminShell>
  );
}
