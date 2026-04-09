import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { API_BASE, defaultRules, WorkforceContext } from './workforceShared';

const LOCAL_CACHE_KEY = 'wf_data_cache';

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

export const WorkforceProvider = ({ children }) => {
    const cachedState = readCachedState();
    const [employees, setEmployees] = useState(cachedState.employees);
    const [attendance, setAttendance] = useState(cachedState.attendance);
    const [rules, setRules] = useState(cachedState.rules);
    const [loading, setLoading] = useState(true);

    const refreshData = useCallback(async () => {
        try {
            const [empRes, attRes, rulesRes] = await Promise.all([
                axios.get(`${API_BASE}/api/employees`),
                axios.get(`${API_BASE}/api/attendance`),
                axios.get(`${API_BASE}/api/rules`)
            ]);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
            setAttendance(attRes.data && typeof attRes.data === 'object' ? attRes.data : {});
            setRules(rulesRes.data || defaultRules);
        } catch (error) {
            console.error("Migration/Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

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
        } catch (error) {
            setEmployees(previousEmployees);
            throw error;
        }
    };

    const saveAttendanceRecord = async (record) => {
        const previousAttendance = attendance;
        const nextAttendance = mergeAttendanceRecord(previousAttendance, record);
        setAttendance(nextAttendance);

        try {
            await axios.post(`${API_BASE}/api/attendance`, record);
        } catch (error) {
            setAttendance(previousAttendance);
            throw error;
        }
    };

    const saveBulkAttendance = async (records) => {
        const previousAttendance = attendance;
        const nextAttendance = mergeAttendanceRecords(previousAttendance, records);
        setAttendance(nextAttendance);

        try {
            await axios.post(`${API_BASE}/api/attendance/bulk`, { records });
        } catch (error) {
            setAttendance(previousAttendance);
            throw error;
        }
    };

    const saveRules = async (newRules) => {
        const previousRules = rules;
        const nextRules = { ...defaultRules, ...newRules };
        setRules(nextRules);

        try {
            await axios.post(`${API_BASE}/api/rules`, nextRules);
        } catch (error) {
            setRules(previousRules);
            throw error;
        }
    };

    const value = {
        employees,
        attendance,
        rules,
        loading,
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
