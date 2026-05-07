import React, { useContext } from 'react';
import { FaBell } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './NotificationsBell.css';

const NotificationsBell = ({ onClick, to = '/teacher/notifications', count, ...rest }) => {
  const { unreadCount } = useContext(AuthContext);
  const totalUnread = typeof count === 'number' ? count : unreadCount;
  const cls = ['notifications-bell', totalUnread > 0 ? 'has-unread' : ''].join(' ');

  if (typeof onClick === 'function') {
    return (
      <button type="button" className={cls} onClick={onClick} aria-label={totalUnread > 0 ? `Tens ${totalUnread} notificações por ler` : 'Notificações'} {...rest}>
        <FaBell className="bell-icon" />
        {totalUnread > 0 && <span className="badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </button>
    );
  }

  return (
    <Link to={to} className={cls} aria-label={totalUnread > 0 ? `Tens ${totalUnread} notificações por ler` : 'Notificações'} {...rest}>
      <FaBell className="bell-icon" />
      {totalUnread > 0 && <span className="badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
    </Link>
  );
};

export default NotificationsBell;
