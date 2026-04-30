import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useWorkforce } from './context/workforceShared';

// Actual Page Components
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import TimeofficeReport from './pages/TimeofficeReport';

const App = () => {
    const { loading, token, logout } = useWorkforce();
    const [page, setPage] = useState('dashboard');

    useEffect(() => {
        const savedTheme = localStorage.getItem('wf_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const handleLogout = () => {
        logout();
        setPage('dashboard');
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                <div style={{ textAlign: 'center', animation: 'pulse 2s infinite' }}>
                    <h1 style={{ marginBottom: '0.5rem', letterSpacing: '-0.02em', color: '#6366f1' }}>WorkForce Pro</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Synchronizing with MongoDB Atlas...</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
                <Login />
                <div className="toast" id="toast"></div>
            </div>
        );
    }

    const renderPage = () => {
        switch(page) {
            case 'dashboard': return <Dashboard />;
            case 'employees': return <Employees />;
            case 'attendance': return <Attendance />;
            case 'calculator': return <Calculator />;
            case 'timeoffice': return <TimeofficeReport />;
            default: return <Dashboard />;
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
            {/* Background Decorations */}
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>

            <div className="app">
                <Sidebar activePage={page} setPage={setPage} onLogout={handleLogout} />
                <main className="main">
                    <Topbar activePage={page} onLogout={handleLogout} />
                    <div className="content">
                        {renderPage()}
                    </div>
                </main>
            </div>
            
            <div className="toast" id="toast"></div>
        </div>
    );
};

export default App;
