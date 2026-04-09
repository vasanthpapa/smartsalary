import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useWorkforce } from './context/workforceShared';

// Actual Page Components
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Calculator from './pages/Calculator';

const App = () => {
    const { loading, storageStatus, syncError, refreshData } = useWorkforce();
    const [page, setPage] = useState('dashboard');

    useEffect(() => {
        const savedTheme = localStorage.getItem('wf_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

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

    const showStorageBanner = Boolean(syncError) || Boolean(storageStatus && (storageStatus.available === false || storageStatus.persistent === false));
    const bannerText = syncError || storageStatus?.message;

    const renderPage = () => {
        switch(page) {
            case 'dashboard': return <Dashboard />;
            case 'employees': return <Employees />;
            case 'attendance': return <Attendance />;
            case 'calculator': return <Calculator />;
            default: return <Dashboard />;
        }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Background Decorations */}
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>

            <div className="app">
                <Sidebar activePage={page} setPage={setPage} />
                <main className="main">
                    <Topbar activePage={page} />
                    {showStorageBanner && (
                        <div
                            style={{
                                margin: '1.5rem 1.5rem 0',
                                padding: '0.9rem 1rem',
                                borderRadius: '16px',
                                border: '1px solid rgba(248, 113, 113, 0.35)',
                                background: 'rgba(127, 29, 29, 0.2)',
                                color: '#fecaca',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                alignItems: 'center',
                                flexWrap: 'wrap'
                            }}
                        >
                            <span style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
                                {bannerText}
                            </span>
                            <button
                                className="secondary-btn small-btn"
                                onClick={refreshData}
                                style={{ width: 'auto', borderColor: 'rgba(252, 165, 165, 0.45)', color: '#fecaca' }}
                            >
                                Retry Sync
                            </button>
                        </div>
                    )}
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
