import React, { useState, useMemo, useRef } from 'react';
import { useWorkforce } from '../context/workforceShared';
import { FileText, Lock, Unlock } from 'lucide-react';
import { API_BASE } from '../context/workforceShared';

const normalizeAttendanceDate = value => {
    const date = String(value || '').trim();
    const isoDate = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoDate) {
        return `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`;
    }

    const localDate = date.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\D|$)/);
    if (localDate) {
        return `${localDate[3]}-${localDate[2].padStart(2, '0')}-${localDate[1].padStart(2, '0')}`;
    }

    const namedMonthDate = date.match(/^(\d{1,2})[\s/-]+([a-z]{3,})[\s/-]+(\d{4})/i);
    if (namedMonthDate) {
        const month = new Date(`${namedMonthDate[2]} 1, 2000`).getMonth() + 1;
        if (month >= 1 && month <= 12) {
            return `${namedMonthDate[3]}-${String(month).padStart(2, '0')}-${namedMonthDate[1].padStart(2, '0')}`;
        }
    }

    return date;
};

const normalizeEmployeeId = value => String(value ?? '').trim().toLowerCase();

const normalizeCocoTime = value => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    }
    if (typeof value === 'number') {
        if (value >= 1000000000) {
            const timestamp = value >= 1000000000000 ? value : value * 1000;
            return normalizeCocoTime(new Date(timestamp));
        }
        if (value >= 0 && value < 1) {
            const minutesFromMidnight = Math.round(value * 24 * 60);
            return `${String(Math.floor(minutesFromMidnight / 60) % 24).padStart(2, '0')}:${String(minutesFromMidnight % 60).padStart(2, '0')}`;
        }
    }

    const text = String(value ?? '').trim();
    if (/^\d{10}(?:\d{3})?$/.test(text)) {
        const timestamp = Number(text);
        return normalizeCocoTime(new Date(text.length === 13 ? timestamp : timestamp * 1000));
    }
    const match = text.match(/\b(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(AM|PM)?\b/i);
    const hourOnlyMatch = !match && text.match(/^\s*(\d{1,2})\s*(AM|PM)\s*$/i);
    const compactTimeMatch = !match && !hourOnlyMatch && text.match(/^\s*(\d{1,2})(\d{2})\s*$/);
    if (!match && !hourOnlyMatch && !compactTimeMatch) return '';

    let hours = Number((match || hourOnlyMatch || compactTimeMatch)[1]);
    const minutes = Number(match?.[2] || compactTimeMatch?.[2] || 0);
    const meridiem = (match?.[3] || hourOnlyMatch?.[2])?.toUpperCase();
    if (minutes > 59 || hours > (meridiem ? 12 : 23) || hours < (meridiem ? 1 : 0)) return '';
    if (meridiem) hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const flattenPunchValues = value => {
    if (Array.isArray(value)) return value.flatMap(flattenPunchValues);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const hour = value.hour ?? value.hours ?? value.hh;
        const minute = value.minute ?? value.minutes ?? value.mm;
        if (hour != null && minute != null) {
            const meridiem = value.meridiem ?? value.ampm ?? '';
            return [`${hour}:${String(minute).padStart(2, '0')} ${meridiem}`];
        }
        const timeFields = ['time', 'timeString', 'formattedTime', 'value', 'timestamp', 'dateTime', 'punchTime', 'checkIn', 'checkInTime', 'checkOut', 'checkOutTime'];
        const knownTimeValues = timeFields.flatMap(field => value[field] == null ? [] : flattenPunchValues(value[field]));
        return knownTimeValues.length ? knownTimeValues : Object.values(value).flatMap(flattenPunchValues);
    }
    return [value];
};

const getCocoPunchTime = (values, edge = 'first') => {
    const candidates = flattenPunchValues(values)
        .flatMap(value => typeof value === 'string' ? value.split(/[\n,|]+/) : [value])
        .map(normalizeCocoTime)
        .filter(Boolean);

    return edge === 'last' ? candidates[candidates.length - 1] || '' : candidates[0] || '';
};

const getCocoRecordTime = (record, fields, edge = 'first') => {
    const timeFieldPattern = edge === 'last'
        ? /check.?out|out.?time|last.?out|punch.?out/i
        : /check.?in|in.?time|first.?in|punch.?in/i;
    const candidateFields = [...new Set([
        ...fields,
        ...Object.keys(record).filter(field => timeFieldPattern.test(field))
    ])];

    for (const field of candidateFields) {
        const time = getCocoPunchTime(record[field], edge);
        if (time) return time;
    }
    return '';
};

const getCocoRecordEmployeeId = record => {
    const fields = ['empId', 'employeeId', 'employeeID', 'empCode', 'employeeCode', 'Empcode'];
    const value = fields.map(field => record[field]).find(item => String(item ?? '').trim());
    return normalizeEmployeeId(value);
};

const isWeekOff = status => String(status || '').trim().toLowerCase().replace(/[\s_-]/g, '') === 'weekoff';

const BulkAttendanceTable = ({ onOpenReport }) => {
    const { employees, attendance, saveBulkAttendance } = useWorkforce();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isCocoSyncing, setIsCocoSyncing] = useState(false);

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
                entries: currentEntries.map(item => {
                    if (item.id === empId) {
                        const updated = { ...item, ...fields };
                        
                        // If check-in time is being changed
                        if ('time' in fields) {
                            const val = fields.time;
                            if (val && val.includes(':')) {
                                const emp = employees.find(e => e.id === empId);
                                const checkInTime = emp?.checkin || '09:00';
                                
                                // Helper to parse time string "HH:mm" into minutes from midnight
                                const parseMins = (tStr) => {
                                    if (!tStr) return 0;
                                    const parts = tStr.split(':');
                                    const h = parseInt(parts[0], 10) || 0;
                                    const m = parseInt(parts[1], 10) || 0;
                                    return h * 60 + m;
                                };
                                
                                // Helper to add minutes to time string "HH:mm"
                                const addMinutes = (timeStr, mins) => {
                                    const [h, m] = timeStr.split(':').map(Number);
                                    const total = h * 60 + m + mins;
                                    const newH = String(Math.floor(total / 60) % 24).padStart(2, '0');
                                    const newM = String(total % 60).padStart(2, '0');
                                    return `${newH}:${newM}`;
                                };
                                
                                const inMins = parseMins(val);
                                const limitTime = addMinutes(checkInTime, 10);
                                const limitMins = parseMins(limitTime);
                                
                                const isEmpSaved = selectedDateAttendance[empId] !== undefined;

                                // Automatically determine status if it's empty, present, or late
                                // Do not automatically change status if the employee's attendance is already saved (edit mode)
                                if (!isEmpSaved) {
                                    if (!updated.status || updated.status === 'present' || updated.status === 'late') {
                                        if (inMins > limitMins) {
                                            updated.status = 'late';
                                        } else {
                                            updated.status = 'present';
                                        }
                                    }
                                }
                            }
                        }
                        return updated;
                    }
                    return item;
                })
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
        setBulkDraft({ key: '', entries: [] }); // Clear draft so UI reflects saved DB state
        hasUserEditedRef.current = false;
        setIsManuallyUnlocked(false);
        alert("Attendance saved!");
    };

    const handleBiometricSync = async () => {
        setIsSyncing(true);
        try {
            const token = localStorage.getItem('wf_auth_token');
            const res = await fetch(`${API_BASE}/api/attendance/sync/etimeoffice`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ date: selectedDate, preview: true })
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(`Server returned non-JSON response (Status ${res.status}): ${text.substring(0, 150)}`);
            }

            if (res.ok && data.success) {
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
                alert(`Sync failed (Status ${res.status}): ${data.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error('Error syncing biometric data:', e);
            alert(`Error syncing biometric data: ${e.message}`);
        }
        setIsSyncing(false);
    };

    const handleCocoSync = async () => {
        setIsCocoSyncing(true);
        try {
            const token = localStorage.getItem('wf_auth_token');
            const response = await fetch(`${API_BASE}/api/coco-attendance/preview`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    Accept: 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`COCO returned an unexpected response (HTTP ${response.status}).`);
            }

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || `COCO attendance request failed (HTTP ${response.status}).`);
            }

            const selectedDateRecords = (Array.isArray(data.records) ? data.records : []).filter(record => (
                normalizeAttendanceDate(record.date ?? record.attendanceDate ?? record.attendance_date) === normalizeAttendanceDate(selectedDate)
            ));
            const cocoRecordsByEmployeeId = new Map();
            const cocoByEmployeeId = new Map();
            selectedDateRecords.forEach(record => {
                const employeeId = getCocoRecordEmployeeId(record);
                if (!employeeId) return;

                const employeeRecords = cocoRecordsByEmployeeId.get(employeeId) || [];
                employeeRecords.push(record);
                cocoRecordsByEmployeeId.set(employeeId, employeeRecords);

                const checkIn = getCocoRecordTime(record, ['checkIns', 'checkIn', 'checkInTime', 'check_in', 'inTime', 'in_time', 'firstIn', 'firstInTime', 'punchInTime', 'in'], 'first');
                if (!checkIn) return;

                const checkOut = getCocoRecordTime(record, ['checkOuts', 'checkOut', 'checkOutTime', 'check_out', 'outTime', 'out_time', 'lastOut', 'lastOutTime', 'punchOutTime', 'out'], 'last');
                const previousPunches = cocoByEmployeeId.get(employeeId);
                cocoByEmployeeId.set(employeeId, {
                    time: previousPunches?.time || checkIn,
                    outTime: checkOut || previousPunches?.outTime || ''
                });
            });

            const weekOffEmployees = tempBulk.filter(employee => isWeekOff(employee.status));
            const weekOffCheckResults = weekOffEmployees.map(employee => {
                const employeeId = normalizeEmployeeId(employee.id);
                const matchingCocoRows = cocoRecordsByEmployeeId.get(employeeId) || [];
                const cocoPunches = cocoByEmployeeId.get(employeeId);

                if (!cocoPunches) {
                    const rawCheckInFields = matchingCocoRows
                        .flatMap(record => Object.entries(record)
                            .filter(([field, value]) => /check.?in|in.?time|first.?in|punch.?in/i.test(field) && value != null)
                            .map(([field, value]) => `${field}=${JSON.stringify(value)}`))
                        .slice(0, 4);
                    const status = matchingCocoRows.length === 0
                        ? 'No COCO row for selected date'
                        : rawCheckInFields.length
                            ? `COCO row found; no usable check-in (${rawCheckInFields.join('; ')})`
                            : 'COCO row found; check-in value is blank';
                    return { employee, update: null, status };
                }

                const update = {
                        date: selectedDate,
                        employeeId: employee.id,
                        status: 'present',
                        time: cocoPunches.time,
                        outTime: cocoPunches.outTime || (employee.outTime === '--:--' ? '' : employee.outTime || ''),
                        workTime: employee.workTime || '',
                        isBiometric: false
                };
                const timeSummary = update.outTime
                    ? `Updated: IN ${update.time}, OUT ${update.outTime}`
                    : `Updated: IN ${update.time}`;
                return { employee, update, status: timeSummary };
            });
            const updates = weekOffCheckResults
                .map(result => result.update)
                .filter(Boolean);

            const employeeCheckReport = weekOffCheckResults.map(({ employee, status }) => (
                `• ${employee.name || 'Employee'} (Emp ID: ${employee.id}): ${status}`
            )).join('\n');

            if (updates.length === 0) {
                const noWeekOffRows = weekOffEmployees.length === 0
                    ? 'No Week Off rows are currently shown for this date. Sync biometric first and confirm the Week Off status.'
                    : 'No attendance was updated because none of the matched Week Off rows had a usable COCO check-in.';
                alert(`Sync COCO checked ${weekOffEmployees.length} Week Off employee(s) for ${selectedDate}. ${noWeekOffRows}\nCOCO rows for selected date: ${selectedDateRecords.length}.\n\n${employeeCheckReport || 'No Week Off employees to check.'}`);
                return;
            }

            const result = await saveBulkAttendance(updates);
            const updatedByEmployeeId = new Map(updates.map(record => [normalizeEmployeeId(record.employeeId), record]));
            setBulkDraft(previous => {
                if (previous.key !== bulkDraftKey) return previous;
                return {
                    ...previous,
                    entries: previous.entries.map(employee => {
                        const update = updatedByEmployeeId.get(normalizeEmployeeId(employee.id));
                        return update ? {
                            ...employee,
                            status: update.status,
                            time: update.time,
                            outTime: update.outTime,
                            workTime: update.workTime
                        } : employee;
                    })
                };
            });
            hasUserEditedRef.current = true;

            alert(result?.queued
                ? `Checked ${weekOffEmployees.length} Week Off employee(s). Updated ${updates.length}; changes are queued to sync.\n\n${employeeCheckReport}`
                : `Checked ${weekOffEmployees.length} Week Off employee(s). Updated ${updates.length}; employees without a COCO check-in were left unchanged.\n\n${employeeCheckReport}`);
        } catch (error) {
            console.error('Error syncing COCO attendance:', error);
            alert(`COCO sync failed: ${error.message}`);
        } finally {
            setIsCocoSyncing(false);
        }
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
                    <button className="secondary-btn small-btn" onClick={handleBiometricSync} disabled={isSyncing || isCocoSyncing} style={{ borderColor: '#3b82f6', color: '#3b82f6', padding: '0.25rem 0.75rem' }}>
                        {isSyncing ? 'Syncing...' : 'Sync Biometric'}
                    </button>
                    <button className="secondary-btn small-btn" onClick={handleCocoSync} disabled={isSyncing || isCocoSyncing} style={{ borderColor: '#8b5cf6', color: '#8b5cf6', padding: '0.25rem 0.75rem' }}>
                        {isCocoSyncing ? 'Syncing...' : 'Sync COCO'}
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

