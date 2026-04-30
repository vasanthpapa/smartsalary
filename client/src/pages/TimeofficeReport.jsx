import React, { useState, useMemo } from 'react';
import { useWorkforce, MONTHS, DAYSHORT } from '../context/workforceShared';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

const TimeofficeReport = () => {
    const { employees, attendance } = useWorkforce();
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [deptFilter, setDeptFilter] = useState('All');

    const downloadPDF = async () => {
        const el = document.getElementById('timeoffice-report-capture');
        if (!el) return;
        
        // Temporarily remove overflow to ensure html2canvas captures full width
        const wrappers = el.querySelectorAll('.timeoffice-grid-wrapper');
        const originalOverflows = [];
        wrappers.forEach(w => {
            originalOverflows.push(w.style.overflowX);
            w.style.overflowX = 'visible';
        });
        
        const originalWidth = el.style.width;
        el.style.width = `${el.scrollWidth}px`;

        // Small delay to allow DOM to render changes
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(el, { 
            scale: 2,
            windowWidth: el.scrollWidth,
            useCORS: true
        });

        // Restore styles
        el.style.width = originalWidth;
        wrappers.forEach((w, i) => {
            w.style.overflowX = originalOverflows[i];
        });

        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // Handle pagination if height exceeds a4 height
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(img, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(img, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Timeoffice_Report_${MONTHS[viewMonth]}_${viewYear}.pdf`);
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
        if (!inTime || !outTime || !workTime || outTime === '--:--' || inTime === '--:--' || workTime === '--:--') return '--:--';
        try {
            const inMins = parseTime(inTime);
            const outMins = parseTime(outTime);
            const workMins = parseTime(workTime);
            
            let totalMins = outMins - inMins;
            if (totalMins < 0) totalMins += 24 * 60;
            
            const breakMins = totalMins - workMins;
            if (breakMins <= 0) return '00:00';
            
            return formatTime(breakMins);
        } catch (e) {
            return '--:--';
        }
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

    const reportData = useMemo(() => {
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        let filteredEmployees = employees;
        if (deptFilter !== 'All') {
            filteredEmployees = employees.filter(e => 
                e.dept && e.dept.toLowerCase() === deptFilter.toLowerCase()
            );
        }

        return filteredEmployees.map(emp => {
            const empData = {
                id: emp.id,
                name: emp.name,
                dept: emp.dept || 'Default',
                daily: [],
                stats: { P: 0, A: 0, WO: 0, HL: 0, LV: 0, totalWorkMins: 0 }
            };

            dates.forEach(d => {
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const record = attendance[dateStr]?.[emp.id];
                
                const dayDate = new Date(viewYear, viewMonth, d);
                const dayName = DAYSHORT[dayDate.getDay()]; // Sun, Mon, etc.

                const inTime = record?.time || '--:--';
                const outTime = record?.outTime || '--:--';
                const workTime = record?.workTime || '00:00';
                const breakTime = calculateBreakTime(inTime, outTime, workTime);
                const statusStr = record?.status || '';
                const st = mapStatus(statusStr);

                // Stats accumulation
                if (st === 'P' || st === 'HD') empData.stats.P++;
                else if (st === 'A') empData.stats.A++;
                else if (st === 'WO') empData.stats.WO++;
                else if (st === 'HL') empData.stats.HL++;
                else if (st === 'LV') empData.stats.LV++;

                if (workTime && workTime !== '--:--') {
                    empData.stats.totalWorkMins += parseTime(workTime);
                }

                empData.daily.push({
                    day: d,
                    dayName,
                    inTime,
                    outTime,
                    workTime: workTime === '--:--' ? '00:00' : workTime,
                    breakTime: breakTime === '--:--' ? '00:00' : breakTime,
                    otTime: '00:00', // Defaulting OT to 00:00 per screenshot
                    status: st
                });
            });

            empData.stats.totalWorkFormatted = formatTime(empData.stats.totalWorkMins);
            return empData;
        });
    }, [viewMonth, viewYear, deptFilter, employees, attendance]);

    // Style helper for status text colors
    const getStatusStyle = (st) => {
        if (st === 'P') return { color: '#16a34a', fontWeight: 700 }; // Green
        if (st === 'A') return { color: '#dc2626', fontWeight: 700 }; // Red
        return { color: 'var(--text-secondary)', fontWeight: 600 };
    };

    return (
        <div className="pg active">
            <style>{`
                .timeoffice-grid-wrapper {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #333;
                    margin-bottom: 2rem;
                    overflow-x: auto;
                    background: #fff;
                    padding: 10px;
                }
                .timeoffice-grid {
                    border-collapse: collapse;
                    width: 100%;
                    min-width: 1200px;
                }
                .timeoffice-grid td, .timeoffice-grid th {
                    border: 1px solid #d1d5db;
                    text-align: center;
                    padding: 3px 2px;
                    white-space: nowrap;
                }
                .timeoffice-grid .th-cell {
                    background-color: #e5e7eb;
                    font-weight: bold;
                    text-align: left;
                    padding-left: 5px;
                }
                .timeoffice-grid .status-p { color: #16a34a; font-weight: bold; }
                .timeoffice-grid .status-a { color: #dc2626; font-weight: bold; }
            `}</style>
            
            <div className="card">
                <div className="ch" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <span className="ct">Department Wise Individual Report</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select 
                            value={deptFilter} 
                            onChange={(e) => setDeptFilter(e.target.value)} 
                            style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 600, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' }}
                        >
                            <option value="All">All Departments</option>
                            <option value="MBT">MBT</option>
                            <option value="Smart">Smart</option>
                            {Array.from(new Set(employees.map(e => e.dept))).filter(d => d && d.toLowerCase() !== 'mbt' && d.toLowerCase() !== 'smart').map((d, i) => (
                                <option key={i} value={d}>{d}</option>
                            ))}
                        </select>
                        <select 
                            value={viewMonth} 
                            onChange={(e) => setViewMonth(parseInt(e.target.value))} 
                            style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 600, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' }}
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <input 
                            type="number" 
                            value={viewYear} 
                            onChange={(e) => setViewYear(parseInt(e.target.value))} 
                            style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: 'var(--text-primary)', fontWeight: 600, width: '90px', padding: '8px 16px', borderRadius: '12px', textAlign: 'center' }} 
                        />
                        <button className="primary-btn small-btn" onClick={downloadPDF} style={{ padding: '8px 16px', height: 'auto' }}>
                            <Download size={16} style={{ marginRight: '6px' }} />
                            Download PDF
                        </button>
                    </div>
                </div>

                <div id="timeoffice-report-capture" style={{ background: '#f8fafc', padding: '20px 0' }}>
                    {reportData.length > 0 ? (
                        reportData.map((emp, idx) => (
                            <div key={emp.id} className="timeoffice-grid-wrapper">
                                <table className="timeoffice-grid">
                                    <tbody>
                                        {/* Header Row 1 */}
                                        <tr>
                                            <td className="th-cell">Dept. Name</td>
                                            <td colSpan={5} style={{textAlign: 'left', paddingLeft: '5px'}}>{emp.dept}</td>
                                            <td className="th-cell" colSpan={4}>CompName</td>
                                            <td colSpan={15} style={{textAlign: 'left', paddingLeft: '5px'}}>MICROBOTWARE TECHNOLOGY</td>
                                            <td className="th-cell" colSpan={4}>Report Month</td>
                                            <td colSpan={3}>{MONTHS[viewMonth]}-{viewYear}</td>
                                        </tr>
                                        {/* Header Row 2 */}
                                        <tr>
                                            <td className="th-cell">Empcode</td>
                                            <td colSpan={3}>{emp.id}</td>
                                            <td className="th-cell">Name</td>
                                            <td colSpan={5} style={{textAlign: 'left', paddingLeft: '5px'}}>{emp.name}</td>
                                            <td className="th-cell" style={{color: '#16a34a'}}>Present</td>
                                            <td>{emp.stats.P}</td>
                                            <td className="th-cell" style={{color: '#2563eb'}}>WO</td>
                                            <td>{emp.stats.WO}</td>
                                            <td className="th-cell">HL</td>
                                            <td>{emp.stats.HL}</td>
                                            <td className="th-cell">LV</td>
                                            <td>{emp.stats.LV}</td>
                                            <td className="th-cell" style={{color: '#dc2626'}}>Absent</td>
                                            <td style={{color: '#dc2626'}}>{emp.stats.A}</td>
                                            <td className="th-cell" colSpan={2}>Tot. Work+OT</td>
                                            <td colSpan={2}>{emp.stats.totalWorkFormatted}</td>
                                            <td className="th-cell" colSpan={2}>Total OT</td>
                                            <td colSpan={6}>0:00</td>
                                        </tr>
                                        
                                        {/* Dates Row */}
                                        <tr>
                                            <td></td>
                                            {emp.daily.map(d => <td key={`day-${d.day}`}>{d.day}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-day-${i}`}>{emp.daily.length + i + 1}</td>)}
                                        </tr>
                                        {/* Day Names Row */}
                                        <tr>
                                            <td></td>
                                            {emp.daily.map(d => <td key={`dayname-${d.day}`}>{d.dayName}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-dayname-${i}`}></td>)}
                                        </tr>
                                        
                                        {/* IN Row */}
                                        <tr>
                                            <td className="th-cell">IN</td>
                                            {emp.daily.map(d => <td key={`in-${d.day}`}>{d.inTime}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-in-${i}`}>--:--</td>)}
                                        </tr>
                                        {/* OUT Row */}
                                        <tr>
                                            <td className="th-cell">OUT</td>
                                            {emp.daily.map(d => <td key={`out-${d.day}`}>{d.outTime}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-out-${i}`}>--:--</td>)}
                                        </tr>
                                        {/* WORK Row */}
                                        <tr>
                                            <td className="th-cell">WORK</td>
                                            {emp.daily.map(d => <td key={`work-${d.day}`}>{d.workTime}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-work-${i}`}>00:00</td>)}
                                        </tr>
                                        {/* Break Row */}
                                        <tr>
                                            <td className="th-cell">Break</td>
                                            {emp.daily.map(d => <td key={`break-${d.day}`}>{d.breakTime}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-break-${i}`}>00:00</td>)}
                                        </tr>
                                        {/* OT Row */}
                                        <tr>
                                            <td className="th-cell">OT</td>
                                            {emp.daily.map(d => <td key={`ot-${d.day}`}>{d.otTime}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-ot-${i}`}>00:00</td>)}
                                        </tr>
                                        {/* Status Row */}
                                        <tr>
                                            <td className="th-cell">Status</td>
                                            {emp.daily.map(d => <td key={`status-${d.day}`} style={getStatusStyle(d.status)}>{d.status}</td>)}
                                            {Array(31 - emp.daily.length).fill().map((_, i) => <td key={`pad-status-${i}`}></td>)}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No attendance records found for this period.
                        </div>
                    )}
                    <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: '#666', background: '#fff' }}>
                        Powered By : e-Time Office Softech Pvt. Ltd. (WorkForce Pro Custom Report)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeofficeReport;
