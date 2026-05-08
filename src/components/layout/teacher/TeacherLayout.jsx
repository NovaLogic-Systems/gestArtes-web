import React from 'react';
import Sidebar from '../Sidebar';
import Topbar from '../Topbar';
import NotificationsBell from '../../NotificationsBell';

const TeacherLayout = ({ children }) => {
  const topbarContent = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <NotificationsBell />
    </div>
  );

  return (
    <div className="teacher-layout">
      <Sidebar role="teacher" />
      <div className="main-content">
        <Topbar rightContent={topbarContent} />
        <main>{children}</main>
      </div>
    </div>
  );
};

export default TeacherLayout;
