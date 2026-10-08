import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    Minus,
    Timer,
    UserRoundX,
    UsersRound
} from 'lucide-react';
import { useWorkforce } from '../context/workforceShared';
import MonthlyLateTracker from '../components/MonthlyLateTracker';

const LEAVE_STATUSES = new Set(['sick_leave', 'office_leave']);
const ATTENTION_STATUSES = new Set(['late', 'half-day', ...LEAVE_STATUSES]);
const TIME_OFF_STATUSES = new Set(['weekoff', 'sick_leave', 'holiday', 'office_leave']);
const CHECKED_IN_STATUSES = new Set(['present', 'late', 'half-day']);

const STATUS_META = {
    present: { label: 'Present', tone: 'present', Icon: CheckCircle2 },
    late: { label: 'Late', tone: 'late', Icon: Timer },
    absent: { label: 'Absent', tone: 'absent', Icon: UserRoundX },
    pending: { label: 'Pending', tone: 'pending', Icon: Clock3 },
    weekoff: { label: 'Week off', tone: 'away', Icon: CalendarDays },
    sick_leave: { label: 'Sick leave', tone: 'away', Icon: CalendarDays },
    holiday: { label: 'Holiday', tone: 'away', Icon: CalendarDays },
    office_leave: { label: 'Office leave', tone: 'away', Icon: CalendarDays },
    'half-day': { label: 'Half day', tone: 'halfday', Icon: Minus }
};

const FILTER_META = {
    attention: { title: 'Needs attention', description: 'Late, half-day and leave attendance for today.' },
    present: { title: 'Present employees', description: 'Employees who checked in on time.' },
    late: { title: 'Late check-ins', description: 'Employees who arrived after their standard check-in.' },
    absent: { title: 'Absent employees', description: 'Employees marked absent today.' },
    pending: { title: 'Attendance pending', description: 'Attendance has not been marked yet.' },
    'half-day': { title: 'Half-day employees', description: 'Employees marked for a half day today.' },
    away: { title: 'Time off today', description: 'Week off, leave and holiday records.' },
    all: { title: 'All employees', description: 'A compact view of today’s attendance.' }
};

const getLocalDateKey = (date) => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const getInitials = (name = '') => name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || '?';

const getStatusMeta = (status) => STATUS_META[status] || {
    label: String(status || 'Pending').replaceAll('_', ' '),
    tone: 'pending',
    Icon: Clock3
};

const Dashboard = ({ onViewAttendance }) => {
    const { employees, attendance } = useWorkforce();
    const [activeFilter, setActiveFilter] = useState('attention');
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const todayLabel = today.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const todayAttendance = useMemo(() => {
        const todayEntries = attendance[todayKey] || {};

        return (employees || []).map(employee => ({
            ...employee,
            status: todayEntries[employee.id]?.status || 'pending',
            time: todayEntries[employee.id]?.time || ''
        }));
    }, [employees, attendance, todayKey]);

    const summary = useMemo(() => {
        const count = status => todayAttendance.filter(row => row.status === status).length;
        const timeOff = todayAttendance.filter(row => TIME_OFF_STATUSES.has(row.status)).length;
        const checkedIn = todayAttendance.filter(row => CHECKED_IN_STATUSES.has(row.status)).length;

        return {
            total: todayAttendance.length,
            present: count('present'),
            late: count('late'),
            absent: count('absent'),
            halfDay: count('half-day'),
            timeOff,
            checkedIn,
            rate: todayAttendance.length ? Math.round((checkedIn / todayAttendance.length) * 100) : 0
        };
    }, [todayAttendance]);

    const filteredAttendance = useMemo(() => {
        const priority = { late: 0, 'half-day': 1, sick_leave: 2, office_leave: 2 };
        let rows = todayAttendance;

        if (activeFilter === 'attention') {
            rows = rows.filter(row => ATTENTION_STATUSES.has(row.status));
        } else if (activeFilter === 'away') {
            rows = rows.filter(row => TIME_OFF_STATUSES.has(row.status));
        } else if (activeFilter !== 'all') {
            rows = rows.filter(row => row.status === activeFilter);
        }

        return [...rows].sort((a, b) => (
            (priority[a.status] ?? 9) - (priority[b.status] ?? 9) ||
            String(a.name || '').localeCompare(String(b.name || ''))
        ));
    }, [activeFilter, todayAttendance]);

    const attentionCount = todayAttendance.filter(row => ATTENTION_STATUSES.has(row.status)).length;
    const currentFilter = FILTER_META[activeFilter] || FILTER_META.attention;

    const statusTiles = [
        { key: 'present', label: 'Present', value: summary.present, Icon: CheckCircle2 },
        { key: 'late', label: 'Late', value: summary.late, Icon: Timer },
        { key: 'absent', label: 'Absent', value: summary.absent, Icon: UserRoundX },
        { key: 'half-day', label: 'Half day', value: summary.halfDay, Icon: Minus },
        { key: 'away', label: 'Time off', value: summary.timeOff, Icon: CalendarDays }
    ];

    return (
        <div className="pg active dashboard-command-center">
            <section className="dashboard-overview-card">
                <div className="dashboard-rate-panel">
                    <div className="dashboard-overview-heading">
                        <span className="dashboard-eyebrow">Today’s attendance</span>
                        <span className="dashboard-date"><CalendarDays size={15} /> {todayLabel}</span>
                    </div>

                    <div className="dashboard-rate-content">
                        <div
                            className="dashboard-rate-ring"
                            style={{ '--attendance-progress': `${Math.min(summary.rate, 100)}%` }}
                            role="img"
                            aria-label={`${summary.rate}% of employees checked in`}
                        >
                            <div>
                                <strong>{summary.rate}%</strong>
                                <span>checked in</span>
                            </div>
                        </div>
                        <div className="dashboard-rate-copy">
                            <strong>{summary.checkedIn} of {summary.total}</strong>
                            <span>employees have checked in today</span>
                            <small>{summary.rate}% attendance</small>
                        </div>
                    </div>
                </div>

                <div className="dashboard-status-panel">
                    <div className="dashboard-status-heading">
                        <div>
                            <span>Quick status</span>
                            <p>Select a status to inspect the matching employees.</p>
                        </div>
                        {attentionCount > 0 ? (
                            <button type="button" className="dashboard-attention-link" onClick={() => setActiveFilter('attention')}>
                                <AlertTriangle size={15} /> {attentionCount} need attention
                            </button>
                        ) : (
                            <span className="dashboard-all-clear"><Check size={15} /> All clear</span>
                        )}
                    </div>

                    <div className="dashboard-status-grid">
                        {statusTiles.map(({ key, label, value, Icon: icon }) => (
                            <button
                                key={key}
                                type="button"
                                className={`dashboard-status-tile status-${key} ${activeFilter === key ? 'active' : ''}`}
                                onClick={() => setActiveFilter(key)}
                                aria-pressed={activeFilter === key}
                            >
                                <span className="dashboard-status-icon">{React.createElement(icon, { size: 17 })}</span>
                                <strong>{value}</strong>
                                <small>{label}</small>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <div className="dashboard-content-grid">
                <section className="dashboard-attendance-card">
                    <header className="dashboard-section-header">
                        <div className="dashboard-section-title">
                            <span className={`dashboard-section-icon ${activeFilter === 'attention' ? 'is-alert' : ''}`}>
                                {activeFilter === 'attention' ? <AlertTriangle size={19} /> : <UsersRound size={19} />}
                            </span>
                            <div>
                                <div className="dashboard-title-line">
                                    <h2>{currentFilter.title}</h2>
                                    <span>{filteredAttendance.length}</span>
                                </div>
                                <p>{currentFilter.description}</p>
                            </div>
                        </div>

                        <div className="dashboard-list-filters" aria-label="Attendance filters">
                            <button type="button" className={activeFilter === 'attention' ? 'active' : ''} onClick={() => setActiveFilter('attention')}>
                                Attention
                            </button>
                            <button type="button" className={activeFilter === 'all' ? 'active' : ''} onClick={() => setActiveFilter('all')}>
                                All staff
                            </button>
                        </div>
                    </header>

                    <div className="dashboard-attendance-list">
                        {filteredAttendance.length > 0 ? filteredAttendance.map(row => {
                            const statusMeta = getStatusMeta(row.status);
                            const StatusIcon = statusMeta.Icon;
                            const checkInText = row.time || (
                                LEAVE_STATUSES.has(row.status) ? 'On leave' :
                                    row.status === 'pending' ? 'Not marked' :
                                    row.status === 'absent' ? 'No check-in' :
                                        TIME_OFF_STATUSES.has(row.status) ? 'Scheduled off' : '—'
                            );

                            return (
                                <article key={row.id} className="dashboard-attendance-row">
                                    <div className="dashboard-person">
                                        <span className="dashboard-avatar">{getInitials(row.name)}</span>
                                        <div>
                                            <strong>{row.name}</strong>
                                            <span>{row.dept || row.role || `Employee ${row.id}`}</span>
                                        </div>
                                    </div>
                                    <span className={`dashboard-status-badge status-${statusMeta.tone}`}>
                                        <StatusIcon size={14} /> {statusMeta.label}
                                    </span>
                                    <div className="dashboard-checkin-time">
                                        <span>{row.time ? 'Check-in' : 'Update'}</span>
                                        <strong>{checkInText}</strong>
                                    </div>
                                </article>
                            );
                        }) : (
                            <div className="dashboard-empty-attendance">
                                <span><CheckCircle2 size={25} /></span>
                                <strong>{activeFilter === 'attention' ? 'Everything looks good' : 'No employees in this status'}</strong>
                                <p>{activeFilter === 'attention' ? 'There are no late, half-day or leave attendance records today.' : 'Choose another status to view attendance records.'}</p>
                            </div>
                        )}
                    </div>

                    <footer className="dashboard-attendance-footer">
                        <span>{filteredAttendance.length > 4 ? `${filteredAttendance.length} records · Scroll to view` : `${filteredAttendance.length} records shown`}</span>
                        <button type="button" onClick={onViewAttendance}>
                            View all attendance <ArrowRight size={16} />
                        </button>
                    </footer>
                </section>

                <div className="dashboard-monthly-panel">
                    <MonthlyLateTracker />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
