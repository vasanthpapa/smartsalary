import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_BASE, defaultRules, WorkforceContext } from './workforceShared';

const LOCAL_CACHE_KEY = 'wf_data_cache';
const LOCAL_SYNC_META_KEY = 'wf_sync_meta';
const DEFAULT_STORAGE_STATUS = {
    mode: API_BASE ? 'checking' : 'mock',
    persistent: !API_BASE,
    available: true,
    message: API_BASE ? null : 'Demo mode is active. Configure the backend database to keep data permanently.'
};

const readCachedState = () => {
    if (typeof window === 'undefined') {
        return { employees: [], attendance: {}, rules: defaultRules };
    }

    try {
        const raw = localStorage.getItem(LOCAL_CACHE_KEY);
        if (!raw) return { employees: [], attendance: {}, rules: defaultRules };

        const parsed = JSON.parse(raw);
        return {
            employees: Array.isArray(parsed.employees) ? parsed.employees : [],
            attendance: parsed.attendance && typeof parsed.attendance === 'object' ? parsed.attendance : {},
            rules: parsed.rules && typeof parsed.rules === 'object' ? { ...defaultRules, ...parsed.rules } : defaultRules
        };
    } catch (error) {
        console.error('Unable to read local cache:', error);
        return { employees: [], attendance: {}, rules: defaultRules };
    }
};

const readSyncMeta = () => {
    if (typeof window === 'undefined') {
        return { hasPendingSync: false };
    }

    try {
        const raw = localStorage.getItem(LOCAL_SYNC_META_KEY);
        if (!raw) return { hasPendingSync: false };

        const parsed = JSON.parse(raw);
        return { hasPendingSync: Boolean(parsed.hasPendingSync) };
    } catch (error) {
        console.error('Unable to read sync metadata:', error);
        return { hasPendingSync: false };
    }
};

const mergeAttendanceRecord = (prevAttendance, record) => ({
    ...prevAttendance,
    [record.date]: {
        ...(prevAttendance[record.date] || {}),
        [record.employeeId]: {
            status: record.status,
            time: record.time
        }
    }
});

const mergeAttendanceRecords = (prevAttendance, records) => {
    let nextAttendance = prevAttendance;
    records.forEach(record => {
        nextAttendance = mergeAttendanceRecord(nextAttendance, record);
    });
    return nextAttendance;
};

const getErrorMessage = (error, fallbackMessage) => (
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
);

const isRecoverableSyncFailure = (error) => (
    !error?.response ||
    error?.response?.status === 503 ||
    error?.response?.data?.code === 'STORAGE_UNAVAILABLE'
);

// Restore all cached attendance records back to the server (bulk push)
const restoreAttendanceToServer = async (attendanceData) => {
    const records = [];
    Object.entries(attendanceData).forEach(([date, empMap]) => {
        if (!empMap || typeof empMap !== 'object') return;
        Object.entries(empMap).forEach(([employeeId, data]) => {
            if (data?.status) {
                records.push({ date, employeeId, status: data.status, time: data.time || '' });
            }
        });
    });
    if (records.length > 0) {
        await axios.post(`${API_BASE}/api/attendance/bulk`, { records });
        console.log(`✅ Restored ${records.length} attendance records from local cache to server.`);
    }
};

export const WorkforceProvider = ({ children }) => {
    const cachedState = readCachedState();
    const cachedSyncMeta = readSyncMeta();
    const [employees, setEmployees] = useState(cachedState.employees);
    const [attendance, setAttendance] = useState(cachedState.attendance);
    const [rules, setRules] = useState(cachedState.rules);
    const [loading, setLoading] = useState(true);
    const [storageStatus, setStorageStatus] = useState(DEFAULT_STORAGE_STATUS);
    const [syncError, setSyncError] = useState(null);
    const [hasPendingSync, setHasPendingSync] = useState(cachedSyncMeta.hasPendingSync);

    const fetchStorageStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/system/status`);
            const nextStatus = response.data?.storage || DEFAULT_STORAGE_STATUS;
            setStorageStatus(nextStatus);
            return nextStatus;
        } catch (error) {
            const nextStatus = error?.response?.data?.storage;
            if (nextStatus) {
                setStorageStatus(nextStatus);
                return nextStatus;
            }
            throw error;
        }
    }, []);

    const captureSyncError = useCallback((error, fallbackMessage) => {
        const nextStatus = error?.response?.data?.storage;
        if (nextStatus) {
            setStorageStatus(nextStatus);
        }
        setSyncError(getErrorMessage(error, fallbackMessage));
    }, []);

    const markPendingSync = useCallback((message) => {
        setHasPendingSync(true);
        setSyncError(message || null);
    }, []);

    const clearPendingSync = useCallback(() => {
        setHasPendingSync(false);
        setSyncError(null);
    }, []);

    const syncLocalCacheToServer = useCallback(async () => {
        await axios.post(`${API_BASE}/api/employees/sync`, { employees });
        await restoreAttendanceToServer(attendance);
        await axios.post(`${API_BASE}/api/rules`, rules);
        clearPendingSync();
    }, [attendance, clearPendingSync, employees, rules]);

    const refreshData = useCallback(async () => {
        try {
            const nextStatus = await fetchStorageStatus();
            if (nextStatus?.persistent && nextStatus?.available === false) {
                if (hasPendingSync) {
                    markPendingSync(null);
                }
                return;
            }

            if (hasPendingSync) {
                await syncLocalCacheToServer();
            }

            const [empRes, attRes, rulesRes] = await Promise.all([
                axios.get(`${API_BASE}/api/employees`),
                axios.get(`${API_BASE}/api/attendance`),
                axios.get(`${API_BASE}/api/rules`)
            ]);

            const serverEmployees  = Array.isArray(empRes.data) ? empRes.data : [];
            const serverAttendance = attRes.data && typeof attRes.data === 'object' ? attRes.data : {};
            const serverRules      = rulesRes.data || defaultRules;

            // ── Attendance restoration logic ──────────────────────────────────
            // If the server returned empty attendance it likely restarted and lost
            // its in-memory store.  Restore from localStorage so the user never
            // sees a blank history.
            const serverHasAttendance = Object.keys(serverAttendance).length > 0;

            if (!serverHasAttendance) {
                const cached = readCachedState();
                const cachedHasAttendance = Object.keys(cached.attendance).length > 0;

                if (cachedHasAttendance) {
                    console.warn('⚠️ Server attendance is empty — restoring from local cache.');
                    setAttendance(cached.attendance);

                    // Push the cached data back to the server in the background
                    restoreAttendanceToServer(cached.attendance).catch(err =>
                        console.error('Failed to restore attendance to server:', err)
                    );
                } else {
                    setAttendance({});
                }
            } else {
                // Server has data — merge with local cache so we never lose records
                // that exist only in one place.
                const cached = readCachedState();
                const merged = { ...cached.attendance };

                // Server is authoritative: overwrite cache entries with server entries
                Object.entries(serverAttendance).forEach(([date, empMap]) => {
                    merged[date] = { ...(merged[date] || {}), ...empMap };
                });

                setAttendance(merged);
            }
            // ─────────────────────────────────────────────────────────────────

            setEmployees(serverEmployees.length > 0 ? serverEmployees : cachedState.employees);
            setRules(serverRules);
            setSyncError(null);
        } catch (error) {
            console.error('Migration/Fetch Error:', error);
            if (isRecoverableSyncFailure(error)) {
                markPendingSync(null);
            } else {
                captureSyncError(error, 'Unable to sync with the backend right now.');
            }
        } finally {
            setLoading(false);
        }
    }, [cachedState.employees, captureSyncError, fetchStorageStatus, hasPendingSync, markPendingSync, syncLocalCacheToServer]);

    useEffect(() => {
        refreshData();

        const newSocket = io(API_BASE);

        newSocket.on('state_changed', (data) => {
            console.log('Live update received:', data);
            refreshData();
        });

        return () => newSocket.close();
    }, [refreshData]);

    // Persist every state change to localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ employees, attendance, rules }));
        } catch (error) {
            console.error('Unable to write local cache:', error);
        }
    }, [employees, attendance, rules]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(LOCAL_SYNC_META_KEY, JSON.stringify({ hasPendingSync }));
        } catch (error) {
            console.error('Unable to write sync metadata:', error);
        }
    }, [hasPendingSync]);

    const saveEmployees = async (newEmployees) => {
        const previousEmployees = employees;
        setEmployees(newEmployees);
        try {
            await axios.post(`${API_BASE}/api/employees/sync`, { employees: newEmployees });
            clearPendingSync();
        } catch (error) {
            if (isRecoverableSyncFailure(error)) {
                markPendingSync(null);
                return { queued: true };
            }
            setEmployees(previousEmployees);
            captureSyncError(error, 'Unable to save employees right now.');
            throw error;
        }
    };

    const saveAttendanceRecord = async (record) => {
        const previousAttendance = attendance;
        const nextAttendance = mergeAttendanceRecord(previousAttendance, record);
        setAttendance(nextAttendance);
        try {
            await axios.post(`${API_BASE}/api/attendance`, record);
            clearPendingSync();
        } catch (error) {
            if (isRecoverableSyncFailure(error)) {
                markPendingSync(null);
                return { queued: true };
            }
            setAttendance(previousAttendance);
            captureSyncError(error, 'Unable to save attendance right now.');
            throw error;
        }
    };

    const saveBulkAttendance = async (records) => {
        const previousAttendance = attendance;
        const nextAttendance = mergeAttendanceRecords(previousAttendance, records);
        setAttendance(nextAttendance);
        try {
            await axios.post(`${API_BASE}/api/attendance/bulk`, { records });
            clearPendingSync();
        } catch (error) {
            if (isRecoverableSyncFailure(error)) {
                markPendingSync(null);
                return { queued: true };
            }
            setAttendance(previousAttendance);
            captureSyncError(error, 'Unable to save attendance right now.');
            throw error;
        }
    };

    const saveRules = async (newRules) => {
        const previousRules = rules;
        const nextRules = { ...defaultRules, ...newRules };
        setRules(nextRules);
        try {
            await axios.post(`${API_BASE}/api/rules`, nextRules);
            clearPendingSync();
        } catch (error) {
            if (isRecoverableSyncFailure(error)) {
                markPendingSync(null);
                return { queued: true };
            }
            setRules(previousRules);
            captureSyncError(error, 'Unable to save rules right now.');
            throw error;
        }
    };

    const value = {
        employees,
        attendance,
        rules,
        loading,
        storageStatus,
        syncError,
        hasPendingSync,
        refreshData,
        saveEmployees,
        saveAttendanceRecord,
        saveBulkAttendance,
        saveRules
    };

    return (
        <WorkforceContext.Provider value={value}>
            {children}
        </WorkforceContext.Provider>
    );
};
