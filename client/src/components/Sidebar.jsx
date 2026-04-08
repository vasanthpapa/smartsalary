import React from 'react';
import { LayoutDashboard, Users, CalendarCheck, Calculator } from 'lucide-react';

const Sidebar = ({ activePage, setPage }) => {
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
      </nav>
    </aside>
  );
};

export default Sidebar;
