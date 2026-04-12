import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useWorkforce, MONTHS, DAYSHORT } from '../context/workforceShared';
import { FileText, X, Lock, Unlock } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const Attendance = () => {
    const { employees, attendance, saveBulkAttendance } = useWorkforce();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Individual Report States
    const [selectedEmp, setSelectedEmp] = useState('');
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const activeEmployeeId = selectedEmp || employees[0]?.id || '';

    // --- Bulk Marking Logic ---
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

    // Autosave logic removed to allow multiple edits before manual lockdown.

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

    // --- Individual Calendar Logic ---
    const calendarData = useMemo(() => {
        if (!activeEmployeeId) return [];
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();

        const days = [];
        // Empty cells for padding
        for (let i = 0; i < firstDay; i++) days.push({ empty: true });

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const att = attendance[dateStr]?.[activeEmployeeId];
            days.push({ day: d, status: att?.status || 'none', time: att?.time });
        }
        return days;
    }, [activeEmployeeId, viewMonth, viewYear, attendance]);

    const totals = useMemo(() => {
        const stats = { P: 0, L: 0, A: 0, W: 0, HD: 0, LV: 0, SL: 0, HL: 0 };
        calendarData.forEach(d => {
            if (d.empty) return;
            if (d.status === 'present') stats.P++;
            else if (d.status === 'late') stats.L++;
            else if (d.status === 'absent') stats.A++;
            else if (d.status === 'weekoff') stats.W++;
            else if (d.status === 'half-day') stats.HD++;
            else if (d.status === 'sick_leave') stats.SL++;
            else if (d.status === 'holiday') stats.HL++;
            else if (d.status.includes('leave')) stats.LV++;
        });
        return stats;
    }, [calendarData]);

    const downloadPDF = async () => {
        const el = document.getElementById('report-capture-area');
        const canvas = await html2canvas(el, { scale: 2 });
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Attendance_Report_${MONTHS[viewMonth]}_${viewYear}.pdf`);
    };

    return (
        <div className="pg active">
            {/* Bulk Attendance */}
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
                        <button className="secondary-btn small-btn" onClick={() => setIsReportOpen(true)} style={{ borderColor: 'var(--primary)', color: 'var(--primary)', padding: '0.25rem 0.75rem' }}>
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

            {/* Individual Report */}
            <div className="card">
                <div className="ch"><span className="ct">Individual Monthly Report</span></div>
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label>Select Employee</label>
                            <select value={activeEmployeeId} onChange={(e) => setSelectedEmp(e.target.value)} className="theme-select" style={{ width: '100%' }}>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="divider" style={{ margin: '0.5rem 0', opacity: 0.1 }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Monthly Totals</h4>
                            <div id="ind-attendance-totals" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {[
                                    { label: 'Present', color: 'dot-present', val: totals.P + totals.L },
                                    { label: 'Late', color: 'dot-late', val: totals.L },
                                    { label: 'Absent', color: 'dot-absent', val: totals.A },
                                    { label: 'Week-off', color: 'dot-weekoff', val: totals.W },
                                    { label: 'Half Day', color: 'dot-halfday', val: totals.HD },
                                    { label: 'Leave', color: 'dot-leave', val: totals.LV },
                                    { label: 'Sick Leave', color: 'dot-sl', val: totals.SL },
                                    { label: 'Holiday', color: 'dot-hl', val: totals.HL }
                                ].map(t => (
                                    <div key={t.label} className="total-grid-item">
                                        <div className={`total-dot ${t.color}`}></div>
                                        <div className="total-label">{t.label}</div>
                                        <div className="total-val">{t.val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                        <div id="ind-calendar-container" style={{ width: '100%', minHeight: '440px', background: 'var(--sidebar-bg)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
                            <div style={{ marginBottom: '2rem', borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))} style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 800, padding: '8px 16px', borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer' }}>
                                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                    <input type="number" value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))} style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 800, width: '110px', padding: '8px 16px', borderRadius: '12px', textAlign: 'center', fontSize: '1.1rem' }} />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Report View</span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>ATTENDANCE MAP</span>
                                </div>
                            </div>
                            <div className="calendar-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                                {DAYSHORT.map(d => <span key={d}>{d.toUpperCase()}</span>)}
                            </div>
                            <div id="ind-calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: '6px', flex: 1 }}>
                                {calendarData.map((d, i) => (
                                    <div key={i} className={`ind-cal-day ${d.empty ? 'empty' :
                                        d.status === 'present' ? 'ind-cal-p' :
                                            d.status === 'late' ? 'ind-cal-l' :
                                                d.status === 'absent' ? 'ind-cal-a' :
                                                    d.status === 'weekoff' ? 'ind-cal-w' :
                                                        d.status === 'half-day' ? 'ind-cal-hd' :
                                                            d.status === 'sick_leave' ? 'ind-cal-sl' :
                                                                d.status === 'holiday' ? 'ind-cal-hl' :
                                                                    d.status.includes('leave') ? 'ind-cal-lv' : ''
                                        }`}>
                                        <span className="ind-cal-date">{d.day || ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Report Modal */}
            {isReportOpen && (
                <div className="modal-overlay" onClick={() => setIsReportOpen(false)}>
                    <div className="modal-content report-preview-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--primary)' }}>Attendance Report Preview</h3>
                            <button className="btn-icon" onClick={() => setIsReportOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="report-document-wrapper">
                            <div id="report-capture-area" className="report-document">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #c63f3f', paddingBottom: '1rem' }}>
                                    <div>
                                        <h1 style={{ color: '#1e293b', margin: 0, fontSize: '1.5rem' }}>WORKFORCE PRO</h1>
                                        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Premium HR Solutions</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.1rem' }}>MONTHLY ATTENDANCE REPORT</h2>
                                        <p style={{ color: '#64748b', fontWeight: 600 }}>{MONTHS[viewMonth]} {viewYear}</p>
                                    </div>
                                </div>
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            {Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }).map((_, i) => (
                                                <th key={i} style={{ fontSize: '10px' }}>{i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map(emp => (
                                            <tr key={emp.id}>
                                                <td style={{ fontWeight: 600 }}>{emp.name}</td>
                                                {Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }).map((_, i) => {
                                                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                                    const att = attendance[dateStr]?.[emp.id];
                                                    const st = att?.status;
                                                    let cls = '';
                                                    if (st === 'present') cls = 'r-present';
                                                    else if (st === 'late') cls = 'r-late';
                                                    else if (st === 'absent') cls = 'r-absent';
                                                    else if (st === 'weekoff') cls = 'r-weekoff';
                                                    else if (st === 'sick_leave') cls = 'r-sick';
                                                    else if (st === 'holiday') cls = 'r-holiday';
                                                    else if (st === 'half-day') cls = 'r-halfday';

                                                    let marker = '-';
                                                    if (st === 'present') marker = 'P';
                                                    else if (st === 'late') marker = 'L';
                                                    else if (st === 'absent') marker = 'A';
                                                    else if (st === 'weekoff') marker = 'W';
                                                    else if (st === 'sick_leave') marker = 'SL';
                                                    else if (st === 'holiday') marker = 'H';
                                                    else if (st === 'half-day') marker = 'HD';
                                                    else if (st?.includes('leave')) marker = 'LV';

                                                    return (
                                                        <td key={i} style={{ textAlign: 'center' }}>
                                                            <span className={`r-cell ${cls}`}>{marker}</span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button className="primary-btn" style={{ width: '220px' }} onClick={downloadPDF}>Download PDF</button>
                            <button className="secondary-btn" style={{ width: '120px' }} onClick={() => setIsReportOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
