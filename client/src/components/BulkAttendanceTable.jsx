import React, { useState, useMemo, useRef } from 'react';
import { useWorkforce } from '../context/workforceShared';
import { FileText, Lock, Unlock } from 'lucide-react';

const BulkAttendanceTable = ({ onOpenReport }) => {
    const { employees, attendance, saveBulkAttendance } = useWorkforce();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const selectedDateAttendance = useMemo(() => attendance[selectedDate] || {}, [attendance, selectedDate]);
    const hasSavedAttendance = Object.keys(selectedDateAttendance).length > 0;
    
    const bulkEntries = useMemo(() => {
        return employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            status: selectedDateAttendance[emp.id]?.status || 'present',
            time: selectedDateAttendance[emp.id]?.time || emp.checkin || '09:00'
        }));
    }, [employees, selectedDateAttendance]);

    const bulkDraftKey = `${selectedDate}::${employees.map(emp => emp.id).join('|')}`;
    const [bulkDraft, setBulkDraft] = useState({ key: '', entries: [] });
    const [isManuallyUnlocked, setIsManuallyUnlocked] = useState(false);
    const hasUserEditedRef = useRef(false);
    
    const tempBulk = bulkDraft.key === bulkDraftKey ? bulkDraft.entries : bulkEntries;
    const isLocked = hasSavedAttendance && !isManuallyUnlocked;

    const updateTemp = (empId, fields) => {
        hasUserEditedRef.current = true;
        setBulkDraft(prev => {
            const currentEntries = prev.key === bulkDraftKey ? prev.entries : bulkEntries;
            return {
                key: bulkDraftKey,
                entries: currentEntries.map(item => item.id === empId ? { ...item, ...fields } : item)
            };
        });
    };

    const handleSaveBulk = async () => {
        const records = tempBulk.map(item => ({
            date: selectedDate,
            employeeId: item.id,
            status: item.status,
            time: item.time
        }));
        await saveBulkAttendance(records);
        hasUserEditedRef.current = false;
        setIsManuallyUnlocked(false);
        alert("Attendance saved!");
    };

    return (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="ch">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="ct">Bulk Attendance Marking</span>
                    {isLocked ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Lock size={12} /> Saved & Locked
                        </span>
                    ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Unlock size={12} /> Editing
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {isLocked && (
                        <button
                            className="secondary-btn small-btn"
                            onClick={() => setIsManuallyUnlocked(true)}
                            style={{ borderColor: 'var(--warning)', color: 'var(--warning)', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Unlock size={14} /> Edit
                        </button>
                    )}
                    <button className="secondary-btn small-btn" onClick={onOpenReport} style={{ borderColor: 'var(--primary)', color: 'var(--primary)', padding: '0.25rem 0.75rem' }}>
                        <FileText size={16} /> Monthly Report
                    </button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            hasUserEditedRef.current = false;
                            setIsManuallyUnlocked(false);
                            setSelectedDate(e.target.value);
                        }}
                        className="bulk-time-input"
                        style={{ width: '150px' }}
                    />
                </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="bulk-att-table">
                    <thead>
                        <tr>
                            <th>Employee Name</th>
                            <th>Attendance Status & Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tempBulk.map(emp => (
                            <tr key={emp.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="av">{emp.name[0]}</div>
                                        <span>{emp.name}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {['present', 'late', 'absent', 'weekoff', 'half-day', 'sick_leave', 'holiday'].map(st => (
                                            <span
                                                key={st}
                                                className={`status-chip ${emp.status === st ? 'active' : ''}`}
                                                data-status={st}
                                                onClick={() => !isLocked && updateTemp(emp.id, { status: st })}
                                                title={isLocked ? 'Attendance is locked. Click Edit to modify.' : ''}
                                                style={{ cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked && emp.status !== st ? 0.4 : 1, transition: 'opacity 0.2s' }}
                                            >
                                                {st.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </span>
                                        ))}

                                        {emp.status === 'late' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', marginLeft: '10px' }}>
                                                <span style={{ fontSize: '1.1rem' }}>🕙</span>
                                                <input
                                                    type="time"
                                                    value={emp.time}
                                                    className="bulk-time-input"
                                                    disabled={isLocked}
                                                    style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto', width: '85px', color: 'var(--warning)', fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'text' }}
                                                    onChange={(e) => updateTemp(emp.id, { time: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!isLocked && (
                <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <button className="primary-btn" style={{ width: '300px' }} onClick={handleSaveBulk}>Save All Attendance</button>
                </div>
            )}
        </div>
    );
};

export default BulkAttendanceTable;
