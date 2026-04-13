import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, Calculator, LogOut } from 'lucide-react';

const Sidebar = ({ activePage, setPage, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'employees', label: 'Employees', icon: <Users size={18} /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck size={18} /> },
    { id: 'calculator', label: 'Calculator', icon: <Calculator size={18} /> }
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-t">WorkForce Pro</div>
        <div className="logo-s">Admin Panel</div>
      </div>
      <nav className="nav">
        {menuItems.map(item => (
          <div 
            key={item.id}
            className={`ni ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.icon} {item.label}
          </div>
        ))}
        {/* Mobile View: Include Logout in nav or adapt layout, but simply removing height fix it */}
      </nav>
      <div className="logout-container" style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)' }}>
        <div 
          className="ni"
          onClick={onLogout}
          style={{ color: 'var(--danger)', marginTop: 'auto' }}
        >
          <LogOut size={18} /> Logout
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
