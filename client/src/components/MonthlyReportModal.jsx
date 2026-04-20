import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { X } from 'lucide-react';
import { useWorkforce, MONTHS } from '../context/workforceShared';

const MonthlyReportModal = ({ onClose }) => {
    const { employees, attendance } = useWorkforce();
    const viewMonth = new Date().getMonth();
    const viewYear = new Date().getFullYear();

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-preview-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ color: 'var(--primary)' }}>Attendance Report Preview</h3>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
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
                    <button className="secondary-btn" style={{ width: '120px' }} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default MonthlyReportModal;
