import React, { useMemo } from 'react';
import { useWorkforce } from '../context/WorkforceContext';

const Dashboard = () => {
    const { employees, attendance } = useWorkforce();

    const stats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntries = attendance[todayStr] || {};
        
        const present = Object.values(todayEntries).filter(a => a.status === 'present' || a.status === 'late').length;
        const absent = Object.values(todayEntries).filter(a => a.status === 'absent').length;
        const late = Object.values(todayEntries).filter(a => a.status === 'late').length;
        const sickToday = Object.values(todayEntries).filter(a => a.status === 'sick_leave').length;
        const holidayToday = Object.values(todayEntries).filter(a => a.status === 'holiday').length;

        return [
            { label: 'Total Employees', value: (employees || []).length, sub: 'Staff members' },
            { label: 'Present Today', value: present, sub: 'Marked present' },
            { label: 'Late Today', value: late, sub: 'After grace time' },
            { label: 'Sick Leave Today', value: sickToday, sub: 'Medical' },
            { label: 'Holiday Today', value: holidayToday, sub: 'Special' }
        ];
    }, [employees, attendance]);

    const todayAttendance = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntries = attendance[todayStr] || {};
        
        return (employees || []).map(emp => ({
            ...emp,
            status: todayEntries[emp.id]?.status || 'pending',
            time: todayEntries[emp.id]?.time || '--:--'
        }));
    }, [employees, attendance]);

    const lateAlerts = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntries = attendance[todayStr] || {};
        return (employees || []).filter(emp => todayEntries[emp.id]?.status === 'late').map(emp => ({
            name: emp.name,
            time: todayEntries[emp.id]?.time
        }));
    }, [employees, attendance]);

    return (
        <div className="pg active">
            <div className="sg">
                {stats.map((s, idx) => (
                    <div key={idx} className="sc">
                        <div className="sl">{s.label}</div>
                        <div className="sv">{s.value}</div>
                        <div className="ss">{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className="two-col">
                <div className="card">
                    <div className="ch"><span className="ct">Today's Attendance</span></div>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayAttendance.map(row => (
                                    <tr key={row.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="av">{row.name[0]}</div>
                                                <span>{row.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`pill ${
                                                row.status === 'present' ? 'p-green' : 
                                                row.status === 'late' ? 'p-amber' : 
                                                row.status === 'absent' ? 'p-red' : 
                                                row.status === 'sick_leave' ? 'p-sl' : 
                                                row.status === 'holiday' ? 'p-hl' : 'p-gray'
                                            }`}>
                                                {row.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{row.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="ch"><span className="ct">Late Check-in Alerts</span></div>
                    <div id="late-alerts">
                        {lateAlerts.length > 0 ? (
                            lateAlerts.map((alert, idx) => (
                                <div key={idx} className="stagger-row" style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '10px', marginBottom: '8px', borderLeft: '3px solid #f59e0b' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alert.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checked in at {alert.time}</div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No late check-ins recorded today.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
