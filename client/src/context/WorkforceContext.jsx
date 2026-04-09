import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_BASE, defaultRules, WorkforceContext } from './workforceShared';

const LOCAL_CACHE_KEY = 'wf_data_cache';
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

export const WorkforceProvider = ({ children }) => {
    const cachedState = readCachedState();
    const [employees, setEmployees] = useState(cachedState.employees);
    const [attendance, setAttendance] = useState(cachedState.attendance);
    const [rules, setRules] = useState(cachedState.rules);
    const [loading, setLoading] = useState(true);
    const [storageStatus, setStorageStatus] = useState(DEFAULT_STORAGE_STATUS);
    const [syncError, setSyncError] = useState(null);

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

    const refreshData = useCallback(async () => {
        try {
            const nextStatus = await fetchStorageStatus();
            if (nextStatus?.persistent && nextStatus?.available === false) {
                setSyncError(nextStatus.message || 'Persistent storage is temporarily unavailable.');
                return;
            }

            const [empRes, attRes, rulesRes] = await Promise.all([
                axios.get(`${API_BASE}/api/employees`),
                axios.get(`${API_BASE}/api/attendance`),
                axios.get(`${API_BASE}/api/rules`)
            ]);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            setAttendance(attRes.data && typeof attRes.data === 'object' ? attRes.data : {});
            setRules(rulesRes.data || defaultRules);
            setSyncError(null);
        } catch (error) {
            console.error("Migration/Fetch Error:", error);
            captureSyncError(error, 'Unable to sync with the backend right now.');
        } finally {
            setLoading(false);
        }
    }, [captureSyncError, fetchStorageStatus]);

    useEffect(() => {
        refreshData();

        const newSocket = io(API_BASE);

        newSocket.on('state_changed', (data) => {
            console.log('Lively update received:', data);
            refreshData();
        });

        return () => newSocket.close();
    }, [refreshData]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ employees, attendance, rules }));
        } catch (error) {
            console.error('Unable to write local cache:', error);
        }
    }, [employees, attendance, rules]);

    const saveEmployees = async (newEmployees) => {
        const previousEmployees = employees;
        setEmployees(newEmployees);

        try {
            await axios.post(`${API_BASE}/api/employees/sync`, { employees: newEmployees });
            setSyncError(null);
        } catch (error) {
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
            setSyncError(null);
        } catch (error) {
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
            setSyncError(null);
        } catch (error) {
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
            setSyncError(null);
        } catch (error) {
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
