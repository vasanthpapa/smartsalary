import React, { useState, useMemo, useRef } from 'react';
import { useWorkforce } from '../context/workforceShared';
import { FileText, Lock, Unlock } from 'lucide-react';
import axios from 'axios';
import { API_BASE } from '../context/workforceShared';

const BulkAttendanceTable = ({ onOpenReport }) => {
    const { employees, attendance, saveBulkAttendance } = useWorkforce();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSyncing, setIsSyncing] = useState(false);

    const selectedDateAttendance = useMemo(() => attendance[selectedDate] || {}, [attendance, selectedDate]);
    const hasSavedAttendance = Object.keys(selectedDateAttendance).length > 0;
    
    const bulkEntries = useMemo(() => {
        return employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            status: selectedDateAttendance[emp.id]?.status || '',
            time: selectedDateAttendance[emp.id]?.time || emp.checkin || '09:00',
            outTime: selectedDateAttendance[emp.id]?.outTime || '',
            workTime: selectedDateAttendance[emp.id]?.workTime || '',
            isBiometric: selectedDateAttendance[emp.id]?.isBiometric || false
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
        const records = tempBulk
            .filter(item => item.status)
            .map(item => ({
                date: selectedDate,
                employeeId: item.id,
                status: item.status,
                time: item.time,
                outTime: item.outTime,
                workTime: item.workTime,
                isBiometric: item.isBiometric
            }));
        await saveBulkAttendance(records);
        hasUserEditedRef.current = false;
        setIsManuallyUnlocked(false);
        alert("Attendance saved!");
    };

    const handleBiometricSync = async () => {
        setIsSyncing(true);
        try {
            const token = localStorage.getItem('wf_auth_token');
            const res = await fetch(`${API_BASE || 'http://localhost:3000'}/api/attendance/sync/etimeoffice`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, preview: true })
            });
            const data = await res.json();
            if (data.success) {
                if (data.records && data.records.length > 0) {
                    setBulkDraft(prev => {
                        const currentEntries = prev.key === bulkDraftKey ? prev.entries : bulkEntries;
                        const newEntries = currentEntries.map(emp => {
                            const syncedRecord = data.records.find(r => r.employeeId === emp.id);
                            if (syncedRecord) {
                                return {
                                    ...emp,
                                    time: syncedRecord.time || emp.time,
                                    outTime: syncedRecord.outTime || emp.outTime,
                                    workTime: syncedRecord.workTime || emp.workTime,
                                    status: syncedRecord.status || emp.status,
                                    isBiometric: true
                                };
                            }
                            return emp;
                        });
                        hasUserEditedRef.current = true;
                        return { key: bulkDraftKey, entries: newEntries };
                    });
                    // Temporarily unlock the UI so the user can save the fetched data
                    setIsManuallyUnlocked(true);
                    alert(`Fetched ${data.records.length} records! Review the table and click 'Save All Attendance' to update the database.`);
                } else {
                    alert('No biometric records found for this date.');
                }
            } else {
                alert(`Sync failed: ${data.error}`);
            }
        } catch (e) {
            alert('Error syncing biometric data');
        }
        setIsSyncing(false);
    };

    return (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="ch" style={{ flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isLocked && (
                        <button
                            className="secondary-btn small-btn"
                            onClick={() => setIsManuallyUnlocked(true)}
                            style={{ borderColor: 'var(--warning)', color: 'var(--warning)', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            <Unlock size={14} /> Edit
                        </button>
                    )}
                    <button className="secondary-btn small-btn" onClick={handleBiometricSync} disabled={isSyncing} style={{ borderColor: '#3b82f6', color: '#3b82f6', padding: '0.25rem 0.75rem' }}>
                        {isSyncing ? 'Syncing...' : 'Sync Biometric'}
                    </button>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '1rem' }}>
                {tempBulk.map(emp => (
                    <div key={emp.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)', paddingBottom: '12px' }}>
                            <div className="av">{emp.name[0]}</div>
                            <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{emp.name}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {['present', 'late', 'absent', 'weekoff', 'half-day', 'sick_leave', 'holiday'].map(st => (
                                <span
                                    key={st}
                                    className={`status-chip ${emp.status === st ? 'active' : ''}`}
                                    data-status={st}
                                    onClick={() => !isLocked && updateTemp(emp.id, { status: st })}
                                    title={isLocked ? 'Attendance is locked. Click Edit to modify.' : ''}
                                    style={{ cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked && emp.status !== st ? 0.4 : 1, transition: 'opacity 0.2s', padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                    {st.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </span>
                            ))}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.1)', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>IN:</span>
                                <input
                                    type="time"
                                    value={emp.time}
                                    className="bulk-time-input"
                                    disabled={isLocked || emp.isBiometric}
                                    style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto', width: '85px', color: 'var(--warning)', fontWeight: 700, cursor: isLocked || emp.isBiometric ? 'not-allowed' : 'text' }}
                                    onChange={(e) => updateTemp(emp.id, { time: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.1)', padding: '6px 10px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OUT:</span>
                                <input
                                    type="time"
                                    value={emp.outTime !== '--:--' ? emp.outTime : ''}
                                    className="bulk-time-input"
                                    disabled={isLocked || emp.isBiometric}
                                    style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto', width: '85px', color: 'var(--warning)', fontWeight: 700, cursor: isLocked || emp.isBiometric ? 'not-allowed' : 'text' }}
                                    onChange={(e) => updateTemp(emp.id, { outTime: e.target.value })}
                                />
                            </div>
                            {emp.workTime && emp.workTime !== '--:--' && (
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                                    {emp.workTime} hrs
                                </div>
                            )}
                            {emp.isBiometric && (
                                <span style={{ fontSize: '0.7rem', background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '12px' }}>Biometric</span>
                            )}
                        </div>
                    </div>
                ))}
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
