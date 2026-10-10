import React, { useCallback, useEffect, useMemo, useState } from 'react';


const COCO_API = `${(import.meta.env.VITE_COCO_API_URL || 'https://coco-eight-vert.vercel.app').replace(/\/+$/, '')}/api/attendance/preview`;

// const COCO_API = `${(import.meta.env.VITE_COCO_API_URL || 'http://localhost:3001').replace(/\/+$/, '')}/api/attendance/preview`;
const displayValue = value => {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
};

const getStatus = value => {
    if (Array.isArray(value)) {
        return value.length ? value.map(displayValue).join(', ') : '';
    }
    if (value === true) return 'Yes';
    if (value === false || value == null || value === '') return '';
    return String(value);
};

const COCOAttendancePreview = () => {
    const [records, setRecords] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState('');
    const [connected, setConnected] = useState(false);

    const fetchAttendance = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError('');

        try {
            const response = await fetch(COCO_API, {
                method: 'GET',
                cache: 'no-store'
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || `Request failed (${response.status})`);
            }

            setRecords(Array.isArray(data.records) ? data.records : []);
            setUpdatedAt(data.updatedAt || new Date().toISOString());
            setConnected(true);
        } catch (err) {
            setConnected(false);
            setError(
                err.message?.includes('Failed to fetch')
                    ? 'Cannot connect to COCO. Check that COCO is running at localhost:3001 and the preview API is available.'
                    : err.message || 'Unable to fetch attendance.'
            );
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    
useEffect(() => {
    fetchAttendance();
}, [fetchAttendance]);

    const parseDate = value => {
    const text = String(value || '').trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return new Date(`${text}T00:00:00`).getTime();
    }

    const match = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

    if (match) {
        return new Date(
            `${match[3]}-${match[2]}-${match[1]}T00:00:00`
        ).getTime();
    }

    return NaN;
};

const dates = useMemo(() => {
    return [
        ...new Set(
            records
                .map(record => String(record.date || '').trim())
                .filter(Boolean)
        )
    ].sort((a, b) => {
        const dateA = parseDate(a);
        const dateB = parseDate(b);

        if (Number.isFinite(dateA) && Number.isFinite(dateB)) {
            return dateB - dateA;
        }

        return b.localeCompare(a);
    });
}, [records]);

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();

        return records.filter(record => {
            const name = String(record.name || '').toLowerCase();
            const empId = String(record.empId || '').toLowerCase();
            const matchesSearch =
                !query || name.includes(query) || empId.includes(query);

            const matchesDate =
                selectedDate === 'all' ||
                String(record.date || '') === selectedDate;

            return matchesSearch && matchesDate;
        });
    }, [records, search, selectedDate]);

    const employeeCount = useMemo(
        () => new Set(
            records
                .map(record => String(record.empId || record.name || '').trim())
                .filter(Boolean)
        ).size,
        [records]
    );

    const hasFilters = Boolean(search.trim()) || selectedDate !== 'all';

    const clearFilters = () => {
        setSearch('');
        setSelectedDate('all');
    };

    const styles = {
        container: {
            padding: '24px',
            color: 'var(--text-primary)',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxSizing: 'border-box',
            width: '100%'
        },
        muted: {
            color: 'var(--text-muted)'
        },
        input: {
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            padding: '11px 13px',
            border: '1px solid var(--border-color)',
            borderRadius: '9px',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            outlineOffset: '2px',
            fontSize: '0.9rem'
        },
        button: {
            padding: '10px 15px',
            border: '1px solid var(--border-color)',
            borderRadius: '9px',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600
        },
        tableCell: {
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color)',
            textAlign: 'left',
            whiteSpace: 'nowrap',
            fontSize: '0.875rem'
        }
    };

    const kpis = [
        {
            label: 'Total Records',
            value: records.length,
            icon: '▤',
            color: '#6366f1'
        },
        {
            label: 'Records Shown',
            value: filteredRecords.length,
            icon: '☷',
            color: '#0d9488'
        },
        {
            label: 'Employees',
            value: employeeCount,
            icon: '♙',
            color: '#d97706'
        },
        {
            label: 'Available Dates',
            value: dates.length,
            icon: '▦',
            color: '#7c3aed'
        }
    ];

    const getWeekOffValue = record => {
    const keys = [
        'weekOff',
        'weekoff',
        'week_off',
        'isWeekOff',
        'isWeekoff',
        'weeklyOff',
        'weekly_off'
    ];

    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(record, key)) {
            return record[key];
        }
    }

    return undefined;
};

const displayWeekOff = record => {
    const value = getWeekOffValue(record);

    if (
        value === false ||
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return '—';
    }

    if (
        typeof value === 'string' &&
        ['no', 'false', '0'].includes(value.trim().toLowerCase())
    ) {
        return '—';
    }

    return displayValue(value);
};

const renderBadge = (value, type) => {
    const status = getStatus(value);

    if (!status) {
        return <span style={styles.muted}>—</span>;
    }

    const normalized = status.trim().toLowerCase();

    const isWeekOff = type === 'weekOff' && (
        value === true ||
        ['yes', 'true', '1', 'week off', 'weekoff', 'weekly off', 'off'].includes(normalized)
    );

    const isActive =
        value === true ||
        ['yes', 'true', 'approved', 'half day'].includes(normalized);

    const palette = isWeekOff
        ? { color: '#dc2626', background: 'rgba(239,68,68,0.13)' }
        : isActive
            ? { color: '#047857', background: 'rgba(16,185,129,0.12)' }
            : { color: 'var(--text-muted)', background: 'rgba(148,163,184,0.12)' };

    return (
        <span
            title={status}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '5px 9px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                ...palette
            }}
        >
            {status}
        </span>
    );
};

    return (
        <div style={styles.container}>
            <style>{`
                .coco-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 14px;
                    margin-bottom: 24px;
                }
                .coco-preview-kpi {
                    padding: 18px;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    background: var(--card-bg);
                    min-width: 0;
                }
                .coco-preview-controls {
                    display: grid;
                    grid-template-columns: minmax(200px, 1.5fr) minmax(160px, 1fr) auto;
                    gap: 12px;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .coco-preview-table tbody tr {
                    transition: background 0.15s ease;
                }
                .coco-preview-table tbody tr:hover {
                    background: var(--hover-bg, rgba(148,163,184,0.07));
                }
                .coco-preview-refresh:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }
                @media (max-width: 900px) {
                    .coco-preview-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 600px) {
                    .coco-preview-controls {
                        grid-template-columns: minmax(0, 1fr);
                    }
                    .coco-preview-header {
                        align-items: flex-start !important;
                        flex-direction: column;
                    }
                    .coco-preview-grid {
                        gap: 10px;
                    }
                    .coco-preview-kpi {
                        padding: 13px;
                    }
                    .coco-preview-container {
                        padding: 15px !important;
                    }
                }
            `}</style>

            <div
                className="coco-preview-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '24px'
                }}
            >
                <div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            marginBottom: '7px'
                        }}
                    >
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                            COCO Attendance Preview
                        </h2>

                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 9px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: connected ? '#059669' : '#d97706',
                                background: connected
                                    ? 'rgba(16,185,129,0.12)'
                                    : 'rgba(245,158,11,0.12)'
                            }}
                        >
                            <span
                                style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: connected ? '#10b981' : '#f59e0b'
                                }}
                            />
                            {connected ? 'Connected' : loading ? 'Connecting...' : 'Disconnected'}
                        </span>
                    </div>

                    <p style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        ...styles.muted
                    }}>
                        Review analyzed attendance before syncing it to SmartSalary.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-btn coco-preview-refresh"
                    onClick={() => fetchAttendance()}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '11px 17px',
                        borderRadius: '9px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span>{loading ? '◌' : '↻'}</span>
                    {loading ? 'Fetching...' : 'Refresh Now'}
                </button>
            </div>

            {error && (
                <div
                    role="alert"
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '14px',
                        marginBottom: '20px',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '10px',
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.08)',
                        fontSize: '0.9rem',
                        lineHeight: 1.6
                    }}
                >
                    <span aria-hidden="true">⚠</span>
                    <div>
                        <strong>Unable to load attendance</strong>
                        <div>{error}</div>
                        <button
                            type="button"
                            onClick={() => fetchAttendance()}
                            style={{
                                ...styles.button,
                                marginTop: '10px',
                                color: '#ef4444'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            <div className="coco-preview-grid">
                {kpis.map((item) => (
                    <div className="coco-preview-kpi" key={item.label}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '15px'
                        }}>
                            <span style={{
                                fontSize: '0.82rem',
                                lineHeight: 1.4,
                                ...styles.muted
                            }}>
                                {item.label}
                            </span>

                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '34px',
                                height: '34px',
                                flexShrink: 0,
                                borderRadius: '9px',
                                color: item.color,
                                background: `${item.color}18`,
                                fontSize: '1.15rem'
                            }}>
                                {item.icon}
                            </span>
                        </div>

                        <div style={{
                            fontSize: '1.75rem',
                            fontWeight: 750,
                            lineHeight: 1.2,
                            overflowWrap: 'anywhere'
                        }}>
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '14px'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 650 }}>
                        Attendance Records
                    </h3>
                    <p style={{
                        margin: '5px 0 0',
                        fontSize: '0.82rem',
                        ...styles.muted
                    }}>
                        Search employees and filter by date.
                    </p>
                </div>

                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        style={{
                            ...styles.button,
                            color: 'var(--text-primary)'
                        }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
            </div>

            <div className="coco-preview-controls">
                <input
                    type="search"
                    aria-label="Search employee name or ID"
                    placeholder="Search employee name or ID..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    style={styles.input}
                />

                <select
                    aria-label="Filter by attendance date"
                    value={selectedDate}
                    onChange={event => setSelectedDate(event.target.value)}
                    style={styles.input}
                >
                    <option value="all">All dates</option>
                    {dates.map(date => (
                        <option key={date} value={date}>{date}</option>
                    ))}
                </select>

                <div style={{
                    fontSize: '0.82rem',
                    whiteSpace: 'nowrap',
                    ...styles.muted
                }}>
                    Showing <strong style={{ color: 'var(--text-primary)' }}>
                        {filteredRecords.length}
                    </strong> of {records.length}
                </div>
            </div>

            {updatedAt && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '7px',
                    marginBottom: '14px',
                    fontSize: '0.78rem',
                    ...styles.muted
                }}>
                    <span style={{ color: connected ? '#10b981' : '#f59e0b' }}>
                        ●
                    </span>
                    Last successful update: {new Date(updatedAt).toLocaleString()}
                    <span>·</span>
                    Manual refresh only
                </div>
            )}

            <div style={{
                overflowX: 'auto',
                width: '100%',
                border: '1px solid var(--border-color)',
                borderRadius: '12px'
            }}>
                <table
                    className="coco-preview-table"
                    style={{
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: '1000px',
    tableLayout: 'auto',
    color: 'var(--text-primary)'
}}
                >
                    <thead>
                        <tr>
                            {[
                                '#',
                                'Employee ID',
                                'Employee',
                                'Date',
                                'Check-in',
                                'Check-out',
                                'Half Day',
                                'Permission',
                                'Week Off'
                            ].map(label => (
                                <th
                                    key={label}
                                    scope="col"
                                    style={{
                                        ...styles.tableCell,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.76rem',
                                        fontWeight: 650,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.035em'
                                    }}
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {filteredRecords.map((record, index) => (
                            <tr
                                key={`${record.date || 'date'}-${record.empId || record.name || 'employee'}-${index}`}
                            >
                                <td style={styles.tableCell}>
                                    <span style={styles.muted}>{index + 1}</span>
                                </td>

                                <td style={styles.tableCell}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '5px 8px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 650
                                    }}>
                                        {displayValue(record.empId)}
                                    </span>
                                </td>

                                <td style={{
                                    ...styles.tableCell,
                                    fontWeight: 600
                                }}>
                                    {displayValue(record.name)}
                                </td>

                                <td style={styles.tableCell}>
                                    {displayValue(record.date)}
                                </td>

                                <td style={styles.tableCell}>
                                    {displayValue(
                                        record.checkIns?.length
                                            ? record.checkIns
                                            : record.checkIn
                                    )}
                                </td>

                                <td style={styles.tableCell}>
                                    {displayValue(
                                        record.checkOuts?.length
                                            ? record.checkOuts
                                            : record.checkOut
                                    )}
                                </td>

                                <td style={styles.tableCell}>
                                    {renderBadge(record.halfDay, 'halfDay')}
                                </td>

                                <td style={styles.tableCell}>
                                    {renderBadge(record.permission, 'permission')}
                                </td>

                                <td style={styles.tableCell}>
    {renderBadge(getWeekOffValue(record), 'weekOff')}
</td>
                            </tr>
                        ))}

                        {filteredRecords.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    style={{
                                        padding: '48px 20px',
                                        textAlign: 'center',
                                        borderBottom: 'none'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '1.8rem',
                                        marginBottom: '12px',
                                        opacity: 0.65
                                    }}>
                                        {loading ? '◌' : '⌕'}
                                    </div>

                                    <div style={{
                                        fontWeight: 650,
                                        marginBottom: '6px'
                                    }}>
                                        {loading && records.length === 0
                                            ? 'Loading attendance...'
                                            : records.length
                                                ? 'No matching records'
                                                : error
                                                    ? 'Attendance unavailable'
                                                    : 'No attendance records yet'}
                                    </div>

                                    <div style={{
                                        fontSize: '0.85rem',
                                        ...styles.muted
                                    }}>
                                        {records.length
                                            ? 'Try changing your search or date filter.'
                                            : error
                                                ? 'Check the COCO server and try refreshing.'
                                                : 'Records will appear here when available from COCO.'}
                                    </div>

                                    {hasFilters && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            style={{
                                                ...styles.button,
                                                marginTop: '14px'
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '9px',
                marginTop: '18px',
                padding: '13px 15px',
                borderRadius: '10px',
                background: 'rgba(99,102,241,0.07)',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                lineHeight: 1.6
            }}>
                <span aria-hidden="true" style={{ color: '#818cf8' }}>ⓘ</span>
                <span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                        Preview only.
                    </strong>{' '}
                    This page does not save or modify SmartSalary attendance.
                    Verify employee IDs and attendance details before syncing.
                </span>
            </div>
        </div>
    );
};

export default COCOAttendancePreview;