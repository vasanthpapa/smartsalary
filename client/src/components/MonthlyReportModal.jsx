import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { X } from 'lucide-react';
import { useWorkforce, MONTHS } from '../context/workforceShared';

const MonthlyReportModal = ({ onClose }) => {
    const { employees, attendance } = useWorkforce();
    const [viewMonth, setViewMonth] = React.useState(new Date().getMonth());
    const [viewYear, setViewYear] = React.useState(new Date().getFullYear());
    const [format, setFormat] = React.useState('summary'); // 'summary' or 'detailed'

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const downloadPDF = async () => {
        const el = document.getElementById('report-capture-area');
        if (!el) return;

        // Temporarily adjust for capture
        const originalWidth = el.style.width;
        const originalMaxWidth = el.style.maxWidth;
        el.style.width = 'fit-content';
        el.style.maxWidth = 'none';
        
        const canvas = await html2canvas(el, { 
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: el.scrollWidth
        });

        el.style.width = originalWidth;
        el.style.maxWidth = originalMaxWidth;

        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Attendance_${format === 'summary' ? 'Summary' : 'Detailed'}_${MONTHS[viewMonth]}_${viewYear}.pdf`);
    };

    const parseTime = (t) => {
        if (!t || t === '--:--') return 0;
        const [h, m] = t.split(':').map(Number);
        return (h * 60) + m;
    };

    const formatTime = (mins) => {
        if (mins <= 0) return '00:00';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const calculateBreakTime = (inTime, outTime, workTime) => {
        if (!inTime || !outTime || !workTime || outTime === '--:--' || inTime === '--:--' || workTime === '--:--') return '00:00';
        const inMins = parseTime(inTime);
        const outMins = parseTime(outTime);
        const workMins = parseTime(workTime);
        let totalMins = outMins - inMins;
        if (totalMins < 0) totalMins += 24 * 60;
        const breakMins = totalMins - workMins;
        return breakMins > 0 ? formatTime(breakMins) : '00:00';
    };

    const mapStatus = (status) => {
        if (!status) return '--';
        if (status === 'present' || status === 'late') return 'P';
        if (status === 'absent') return 'A';
        if (status === 'weekoff') return 'WO';
        if (status === 'half-day') return 'HD';
        if (status === 'sick_leave' || status.includes('leave')) return 'LV';
        if (status === 'holiday') return 'HL';
        return status.substring(0, 2).toUpperCase();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-preview-card" style={{ maxWidth: '95vw', width: format === 'detailed' ? '1200px' : '900px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <h3 style={{ color: 'var(--primary)', margin: 0 }}>Attendance Report Preview</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select 
                            value={format} 
                            onChange={(e) => setFormat(e.target.value)} 
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <option value="summary">Summary Grid</option>
                            <option value="detailed">Time-Office (Detailed)</option>
                        </select>
                        <select 
                            value={viewMonth} 
                            onChange={(e) => setViewMonth(parseInt(e.target.value))} 
                            style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 600, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <input 
                            type="number" 
                            value={viewYear} 
                            onChange={(e) => setViewYear(parseInt(e.target.value))} 
                            style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 600, width: '80px', padding: '5px 10px', borderRadius: '8px', textAlign: 'center' }} 
                        />
                        <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                <div className="report-document-wrapper">
                    <div id="report-capture-area" className="report-document">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '2px solid #c63f3f', paddingBottom: '1rem' }}>
                            <div>
                                <h1 style={{ color: '#1e293b', margin: 0, fontSize: '1.5rem' }}>WORKFORCE PRO</h1>
                                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Premium HR Solutions</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.1rem' }}>{format === 'summary' ? 'MONTHLY SUMMARY' : 'TIME OFFICE'} REPORT</h2>
                                <p style={{ color: '#64748b', fontWeight: 600 }}>{MONTHS[viewMonth]} {viewYear}</p>
                            </div>
                        </div>

                        {format === 'summary' ? (
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Employee</th>
                                        {dates.map(d => <th key={d} style={{ fontSize: '10px' }}>{d}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{emp.name}</td>
                                            {dates.map(d => {
                                                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
                                                    <td key={d} style={{ textAlign: 'center' }}>
                                                        <span className={`r-cell ${cls}`}>{marker}</span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="detailed-report-view">
                                {employees.map(emp => {
                                    const stats = { P: 0, A: 0, WO: 0, HL: 0, LV: 0, workMins: 0 };
                                    const daily = dates.map(d => {
                                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const record = attendance[dateStr]?.[emp.id];
                                        const st = mapStatus(record?.status);
                                        if (st === 'P' || st === 'HD') stats.P++;
                                        else if (st === 'A') stats.A++;
                                        else if (st === 'WO') stats.WO++;
                                        else if (st === 'HL') stats.HL++;
                                        else if (st === 'LV') stats.LV++;
                                        
                                        const workTime = record?.workTime || '00:00';
                                        if (workTime !== '00:00' && workTime !== '--:--') stats.workMins += parseTime(workTime);

                                        return {
                                            in: record?.time || '--:--',
                                            out: record?.outTime || '--:--',
                                            work: workTime === '--:--' ? '00:00' : workTime,
                                            break: calculateBreakTime(record?.time, record?.outTime, workTime),
                                            st
                                        };
                                    });

                                    return (
                                        <div key={emp.id} style={{ marginBottom: '1.5rem', border: '1px solid #ddd', padding: '10px', background: '#fff' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                                                <span>{emp.id} - {emp.name} ({emp.dept || 'Default'})</span>
                                                <span style={{ color: 'var(--primary)' }}>
                                                    P:{stats.P} | A:{stats.A} | WO:{stats.WO} | LV:{stats.LV} | Work: {formatTime(stats.workMins)}
                                                </span>
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '2px', fontWeight: 'bold' }}>Day</td>
                                                        {dates.map(d => <td key={d} style={{ border: '1px solid #ddd', padding: '2px' }}>{d}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '2px', fontWeight: 'bold' }}>IN</td>
                                                        {daily.map((d, i) => <td key={i} style={{ border: '1px solid #ddd', padding: '2px' }}>{d.in}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '2px', fontWeight: 'bold' }}>OUT</td>
                                                        {daily.map((d, i) => <td key={i} style={{ border: '1px solid #ddd', padding: '2px' }}>{d.out}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '2px', fontWeight: 'bold' }}>Work</td>
                                                        {daily.map((d, i) => <td key={i} style={{ border: '1px solid #ddd', padding: '2px' }}>{d.work}</td>)}
                                                    </tr>
                                                    <tr>
                                                        <td style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '2px', fontWeight: 'bold' }}>St.</td>
                                                        {daily.map((d, i) => (
                                                            <td key={i} style={{ border: '1px solid #ddd', padding: '2px', color: d.st === 'P' ? '#16a34a' : d.st === 'A' ? '#dc2626' : '#666', fontWeight: 'bold' }}>
                                                                {d.st}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button className="primary-btn" style={{ width: '220px' }} onClick={downloadPDF}>Download PDF</button>
                    <button className="secondary-btn" style={{ width: '120px' }} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default MonthlyReportModal;
