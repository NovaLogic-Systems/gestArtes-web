import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { getNotifications, markAsRead, deleteNotification } from '../../services/notificationService';
import Button from '../../components/ui/Button';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const { setUnreadCount } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      const response = await getNotifications();
      setNotifications(response.data);
      const unread = response.data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    };
    fetchNotifications();
  }, [setUnreadCount]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setNotifications(currentNotifications =>
      currentNotifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    const teacherTypes = ['coaching', 'join_request', 'schedule', 'system', 'penalty'];
    return teacherTypes.includes(n.type);
  });

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div>
          <h1 className="notifications-title">Notificações</h1>
          <p className="page-subtitle">Comunicações recentes e alertas relevantes para a sua atividade</p>
        </div>
        <Button as={Link} to="/teacher/dashboard" variant="secondary" size="sm" className="notifications-back-button">
          Voltar ao painel
        </Button>
      </header>
      <div className="filter-tabs">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'filter-tab-button filter-tab-button-active' : 'filter-tab-button'}
        >
          Todas
        </Button>
        <Button
          size="sm"
          variant={filter === 'teacher' ? 'primary' : 'secondary'}
          onClick={() => setFilter('teacher')}
          style={{ marginLeft: '0.6rem' }}
        >
          Relevantes para Professor
        </Button>
      </div>
      <div className="notifications-list">
        {filteredNotifications.map(notification => {
          const title = String(notification.title || '').trim();
          const message = String(notification.message || '').trim();
          const hasSeparateMessage = message && message !== title;

          return (
            <div key={notification.id} className={`notification-item ${notification.isRead ? 'read' : ''}`}>
              <div className="notification-copy">
                {title ? <h2 className="notification-title">{title}</h2> : null}
                {hasSeparateMessage || !title ? (
                  <p className="notification-message">{message || 'Sem detalhes adicionais.'}</p>
                ) : null}
              </div>
              <div className="actions">
                <Button
                  variant={notification.isRead ? 'secondary' : 'cta'}
                  size="sm"
                  disabled={notification.isRead}
                  onClick={() => handleMarkAsRead(notification.id)}
                  className={notification.isRead ? 'mark-read-button is-read' : 'mark-read-button'}
                >
                  {notification.isRead ? 'Lida' : 'Marcar como lida'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(notification.id)} style={{ marginLeft: '0.5rem' }}>
                  Dispensar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPage;
