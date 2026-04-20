import React, { useState, useMemo } from 'react';
import { useWorkforce, MONTHS } from '../context/workforceShared';

const MonthlyLateTracker = () => {
    const { employees, attendance } = useWorkforce();
    
    const [selectedEmp, setSelectedEmp] = useState('');
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    
    const activeEmployeeId = selectedEmp || (employees && employees.length > 0 ? employees[0].id : '');

    const lateRecords = useMemo(() => {
        if (!activeEmployeeId) return [];
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        
        const records = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const att = attendance[dateStr]?.[activeEmployeeId];
            if (att && att.status === 'late') {
                records.push({ date: dateStr, time: att.time });
            }
        }
        return records;
    }, [activeEmployeeId, viewMonth, viewYear, attendance]);

    return (
        <div className="card" style={{ marginTop: '24px' }}>
            <div className="ch"><span className="ct">Individual Monthly Late Tracker</span></div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label>Select Employee</label>
                    <select value={activeEmployeeId} onChange={(e) => setSelectedEmp(e.target.value)} className="theme-select" style={{ width: '100%' }}>
                        {(employees || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                    <label>Month</label>
                    <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))} className="theme-select" style={{ width: '100%' }}>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                
                <div className="input-group" style={{ flex: '1 1 100px' }}>
                    <label>Year</label>
                    <input type="number" value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                {lateRecords.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Checked-in At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lateRecords.map((record, idx) => {
                                const dateObj = new Date(record.date);
                                const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                                return (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{formattedDate}</td>
                                        <td><span className="pill p-amber">Late</span></td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{record.time}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--input-bg)', borderRadius: '12px' }}>
                        No late check-ins found for the selected month. Awesome!
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonthlyLateTracker;
