import React, { useState, useMemo, useEffect } from 'react';
import { useWorkforce, MONTHS } from '../context/workforceShared';
import { Download, Calculator as CalcIcon, RefreshCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

// ── Only these three employees get the Reviews field ──
const REVIEW_EMPLOYEES = ['gunasri', 'sireesha', 'vishnukumar'];

const Calculator = () => {
    const { employees, attendance, rules } = useWorkforce();

    const [selEmpId, setSelEmpId]     = useState('');
    const [month, setMonth]           = useState(new Date().getMonth());
    const [year, setYear]             = useState(new Date().getFullYear());
    const [basic, setBasic]           = useState('');
    const [workedDays, setWorkedDays] = useState('');
    const [otHours, setOtHours]       = useState('');
    const [earlyCount, setEarlyCount] = useState('');
    const [morningCount, setMorningCount] = useState('');
    const [batchCount, setBatchCount] = useState('');
    const [allowance, setAllowance]   = useState('');
    const [extraDays, setExtraDays]   = useState('');
    const [penalty, setPenalty]       = useState('');
    const [expense, setExpense]       = useState('');
    const [lateDays, setLateDays]     = useState('');
    const [reviewCount, setReviewCount] = useState(''); // ← NEW
    const [showResult, setShowResult] = useState(false);

    // ── Determine if the selected employee gets the Reviews field ──
    const showReviews = useMemo(() => {
        const emp = employees.find(e => e.id === selEmpId);
        if (!emp) return false;
        return REVIEW_EMPLOYEES.some(name =>
            emp.name.toLowerCase().includes(name)
        );
    }, [selEmpId, employees]);

    // ── Auto-populate when employee / date changes ──
    useEffect(() => {
        if (!selEmpId) return;
        const emp = employees.find(e => e.id === selEmpId);
        if (emp) setBasic(parseFloat(emp.salary) || 0);

        let worked = 0, late = 0, takenWeekOffs = 0;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const att = attendance[dateStr]?.[selEmpId];
            if (att?.status === 'present' || att?.status === 'late' || att?.status === 'holiday') worked++;
            if (att?.status === 'late') late++;
            if (att?.status === 'half-day') worked += 0.5;
            if (att?.status === 'weekoff') takenWeekOffs++;
        }
        setWorkedDays(worked);
        setLateDays(late);
        
        // Extra working days logic: 4 week-offs allowed. Unused week-offs = extra working days.
        setExtraDays(Math.max(0, 4 - takenWeekOffs));
    }, [selEmpId, month, year, employees, attendance]);

    // ── Strictly reset manual fields ONLY when the employee selection changes ──
    useEffect(() => {
        setOtHours('');
        setEarlyCount('');
        setMorningCount('');
        setBatchCount('');
        setAllowance('');
        setPenalty('');
        setExpense('');
        setReviewCount('');
    }, [selEmpId]);

    const results = useMemo(() => {
        const safeBasic    = Number(basic)        || 0;
        const safeWorked   = Number(workedDays)   || 0;
        const safeOt       = Number(otHours)      || 0;
        const safeEarly    = Number(earlyCount)   || 0;
        const safeMorning  = Number(morningCount) || 0;
        const safeBatch    = Number(batchCount)   || 0;
        const safeAllowance = Number(allowance)   || 0;
        const safeExtra    = Number(extraDays)    || 0;
        const safePenalty  = Number(penalty)      || 0;
        const safeExpense  = Number(expense)      || 0;
        const safeLateDays = Number(lateDays)     || 0;
        const safeReviews  = showReviews ? (Number(reviewCount) || 0) : 0; // ← NEW

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const perDay      = safeBasic / daysInMonth;

        const basicAmt   = perDay * safeWorked;
        const otAmt      = safeOt * 100;
        const earlyAmt   = safeEarly * 200;
        const morningAmt = safeMorning * 150;
        const batchAmt   = safeBatch * 100;
        const extraAmt   = safeExtra * perDay;
        const reviewAmt  = safeReviews * 20; // ← NEW  ₹20 per review

        let latePenaltyAmt = 0;
        if (rules?.lateType === 'halfday') {
            latePenaltyAmt = Math.floor(safeLateDays / (rules?.lateN || 3)) * (perDay / 2);
        } else {
            latePenaltyAmt = Math.floor(safeLateDays / (rules?.lateN || 3)) * (rules?.lateFixed || 500);
        }

        const totalAdd = basicAmt + otAmt + earlyAmt + morningAmt + batchAmt + safeAllowance + extraAmt + reviewAmt;
        const totalDed = safePenalty + safeExpense + latePenaltyAmt;
        const net      = totalAdd - totalDed;

        return {
            perDay, basicAmt, otAmt, earlyAmt, morningAmt, batchAmt,
            extraAmt, latePenaltyAmt, reviewAmt,       // ← reviewAmt added
            penalty: safePenalty, expense: safeExpense,
            allowance: safeAllowance,
            net: Number(net.toFixed(2)) || 0
        };
    }, [basic, workedDays, otHours, earlyCount, morningCount, batchCount,
        allowance, extraDays, penalty, expense, lateDays, reviewCount,
        showReviews, rules, month, year]);

    const empName = employees.find(e => e.id === selEmpId)?.name || '';

    // ── Download ──
    const handleDownload = async () => {
        const wrap = document.createElement('div');
        wrap.style.cssText = `
            position:fixed; top:-9999px; left:-9999px; width:900px;
            background:#ffffff; font-family:'Inter','Outfit',sans-serif;
            padding:40px 48px; box-sizing:border-box;
        `;

        const row = (label, value, valueColor = '#111827') => `
            <tr>
                <td style="padding:10px 0;font-size:15px;color:#1e293b;font-weight:500;width:50%;border-bottom:1px solid #f1f5f9;">${label}</td>
                <td style="padding:10px 0;font-size:15px;color:${valueColor};font-weight:700;text-align:right;width:50%;border-bottom:1px solid #f1f5f9;">${value}</td>
            </tr>`;

        // ── Conditionally include the Reviews row in the download ──
        const reviewRow = showReviews
            ? row('Reviews (+)', `₹${results.reviewAmt.toFixed(2)}`, '#16a34a')
            : '';

        wrap.innerHTML = `
            <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #1e293b;">
                <p style="font-size:20px;font-weight:800;color:#1e293b;margin:0;">
                    Salary Statement for <span style="color:#1e3a8a;text-decoration:underline;">${empName}</span>
                </p>
                <p style="font-size:13px;color:#64748b;margin:4px 0 0 0;">${MONTHS[month]} ${year}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tbody>
                    <tr><td colspan="2" style="padding:0;">
                        <table style="width:100%;border-collapse:collapse;"><tbody>
                            <tr>
                                <td style="width:50%;vertical-align:top;padding-right:32px;">
                                    <table style="width:100%;border-collapse:collapse;"><tbody>
                                        ${row('Basic Salary', `₹${results.basicAmt.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`)}
                                        ${row('Early Check-in', `₹${results.earlyAmt.toFixed(2)}`)}
                                        ${row('Morning Batch', `₹${results.batchAmt.toFixed(2)}`)}
                                        ${row('Extra Days (+)', `₹${results.extraAmt.toFixed(2)}`, '#16a34a')}
                                        ${reviewRow}
                                        ${row('Expense (-)', `₹${results.expense.toFixed(2)}`, '#dc2626')}
                                    </tbody></table>
                                </td>
                                <td style="width:50%;vertical-align:top;padding-left:32px;border-left:1px solid #e2e8f0;">
                                    <table style="width:100%;border-collapse:collapse;"><tbody>
                                        ${row('OT Amount', `₹${results.otAmt.toFixed(2)}`)}
                                        ${row('Morning Check-in', `₹${results.morningAmt.toFixed(2)}`)}
                                        ${row('Allowance (+)', `₹${results.allowance.toFixed(2)}`, '#16a34a')}
                                        ${row('Penalty (-)', `₹${results.penalty.toFixed(2)}`, '#dc2626')}
                                        ${row('Late Penalty (-)', `₹${results.latePenaltyAmt.toFixed(2)}`, '#dc2626')}
                                    </tbody></table>
                                </td>
                            </tr>
                        </tbody></table>
                    </td></tr>
                </tbody>
            </table>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-top:2px solid #1e293b;margin-top:8px;">
                <span style="font-size:18px;font-weight:800;color:#1e293b;">Net Payable Salary</span>
                <span style="font-size:28px;font-weight:900;color:#16a34a;">₹${results.net.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            </div>`;

        document.body.appendChild(wrap);
        try {
            const canvas = await html2canvas(wrap, {
                scale: 3, backgroundColor: '#ffffff',
                useCORS: true, logging: false, width: 900, windowWidth: 900,
            });
            const link = document.createElement('a');
            link.download = `Salary_Statement_${empName}_${MONTHS[month]}_${year}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 1.0);
            link.click();
        } finally {
            document.body.removeChild(wrap);
        }
    };

    return (
        <div className="pg active">
            <section className="calculator-card" style={{ marginTop: 0 }}>
                <div className="input-grid">
                    <div className="input-group full-width">
                        <label>Employee Name</label>
                        <select value={selEmpId} onChange={(e) => setSelEmpId(e.target.value)}>
                            <option value="" disabled>Select Employee</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Select Month</label>
                        <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Year</label>
                        <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} />
                    </div>
                    <div className="input-group">
                        <label>Monthly Basic Salary (₹)</label>
                        <div className="currency-input">
                            <span>₹</span>
                            <input type="number" value={basic} onChange={(e) => setBasic(e.target.value)} />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Total Worked Days</label>
                        <input type="number" value={workedDays} onChange={(e) => setWorkedDays(e.target.value)} step="0.5" />
                    </div>
                    <div className="input-group">
                        <label>Early Check-in (₹200)</label>
                        <input type="number" value={earlyCount} onChange={(e) => setEarlyCount(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Morning Check-in (₹150)</label>
                        <input type="number" value={morningCount} onChange={(e) => setMorningCount(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Morning Batch (₹100)</label>
                        <input type="number" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Allowance (Addition ₹)</label>
                        <input type="number" value={allowance} onChange={(e) => setAllowance(e.target.value)} className="input-added" />
                    </div>
                    <div className="input-group">
                        <label>Penalty (Deduction ₹)</label>
                        <input type="number" value={penalty} onChange={(e) => setPenalty(e.target.value)} className="input-deducted" />
                    </div>
                    <div className="input-group">
                        <label>Expense (Deduction ₹)</label>
                        <input type="number" value={expense} onChange={(e) => setExpense(e.target.value)} className="input-deducted" />
                    </div>
                    <div className="input-group">
                        <label>Late Check-in (Days)</label>
                        <input type="number" value={lateDays} onChange={(e) => setLateDays(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Extra working Days</label>
                        <input type="number" value={extraDays} onChange={(e) => setExtraDays(e.target.value)} />
                    </div>
                    <div className="input-group full-width">
                        <label>Overtime Hours (₹100/hr)</label>
                        <input type="number" value={otHours} onChange={(e) => setOtHours(e.target.value)} />
                    </div>

                    {/* ── Reviews field — visible only for Gunasri, Shreesha, Vishnu ── */}
                    {showReviews && (
                        <div className="input-group full-width">
                            <label>Reviews (₹20 per review)</label>
                            <input
                                type="number"
                                value={reviewCount}
                                onChange={(e) => setReviewCount(parseInt(e.target.value) || 0)}
                                className="input-added"
                                min="0"
                            />
                        </div>
                    )}
                </div>

                <div className="stats-grid calc-stats">
                    <div className="stat-item">
                        <span className="stat-label">Per Day Rate</span>
                        <span className="stat-value">₹{(results.perDay || 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Half Day Rate</span>
                        <span className="stat-value">₹{((results.perDay || 0) / 2).toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Payable Days</span>
                        <span className="stat-value">{(Number(workedDays) || 0) + (Number(extraDays) || 0)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Deductions</span>
                        <span className="stat-value" style={{ color: 'var(--danger)' }}>
                            ₹{((Number(penalty) || 0) + (Number(expense) || 0) + (Number(results.latePenaltyAmt) || 0)).toFixed(0)}
                        </span>
                    </div>
                </div>

                <div className="action-row" style={{ display: 'flex', gap: '10px' }}>
                    <button className="primary-btn" onClick={() => setShowResult(true)}>
                        <CalcIcon size={18} style={{ marginRight: '8px' }} />
                        Calculate Salary
                    </button>
                    <button className="secondary-btn" onClick={() => setShowResult(false)}>
                        <RefreshCcw size={18} style={{ marginRight: '8px' }} />
                        Reset
                    </button>
                </div>

                <div className="divider"></div>

                {showResult && (
                    <div id="result-section" className="result-container" style={{ animation: 'slideUpFade 0.4s forwards' }}>
                        <div className="result-header">
                            <h3>
                                Salary Statement for{' '}
                                <span className="name-highlight">{empName}</span>
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {MONTHS[month]} {year}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: '20px' }}>
                            {/* Left column */}
                            <div>
                                {[
                                    { label: 'Basic Salary',   value: `₹${results.basicAmt.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`, color: '#111827' },
                                    { label: 'Early Check-in', value: `₹${results.earlyAmt.toFixed(2)}`,  color: '#111827' },
                                    { label: 'Morning Batch',  value: `₹${results.batchAmt.toFixed(2)}`,  color: '#111827' },
                                    { label: 'Extra Days (+)', value: `₹${results.extraAmt.toFixed(2)}`,  color: '#16a34a' },
                                    // ── Reviews row (left column, only when applicable) ──
                                    ...(showReviews ? [{ label: 'Reviews (+)', value: `₹${results.reviewAmt.toFixed(2)}`, color: '#16a34a' }] : []),
                                    { label: 'Expense (-)',    value: `₹${results.expense.toFixed(2)}`,   color: '#dc2626' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                                        <span style={{ fontSize:'14px', color:'#374151', fontWeight:'500' }}>{label}</span>
                                        <span style={{ fontSize:'14px', color, fontWeight:'700' }}>{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Right column */}
                            <div>
                                {[
                                    { label: 'OT Amount',       value: `₹${results.otAmt.toFixed(2)}`,         color: '#111827' },
                                    { label: 'Morning Check-in',value: `₹${results.morningAmt.toFixed(2)}`,    color: '#111827' },
                                    { label: 'Allowance (+)',   value: `₹${results.allowance.toFixed(2)}`,     color: '#16a34a' },
                                    { label: 'Penalty (-)',     value: `₹${results.penalty.toFixed(2)}`,       color: '#dc2626' },
                                    { label: 'Late Penalty (-)',value: `₹${results.latePenaltyAmt.toFixed(2)}`,color: '#dc2626' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f1f5f9' }}>
                                        <span style={{ fontSize:'14px', color:'#374151', fontWeight:'500' }}>{label}</span>
                                        <span style={{ fontSize:'14px', color, fontWeight:'700' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="net-salary">
                            <span className="net-label">Net Payable Salary</span>
                            <span className="net-value">₹{results.net.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                        </div>

                        <div className="download-row">
                            <button className="secondary-btn download-btn" onClick={handleDownload}>
                                <Download size={18} style={{ marginRight: '8px' }} />
                                Download Statement (JPEG)
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Calculator;
