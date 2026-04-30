const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const mockStore = require('../config/mockStore');
const { shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');
const { syncBiometricAttendance } = require('../services/biometricSync');

const attendanceMapToRecords = (attendanceMap = {}) => {
    const records = [];
    Object.entries(attendanceMap).forEach(([date, employeeMap]) => {
        if (!employeeMap || typeof employeeMap !== 'object') return;
        Object.entries(employeeMap).forEach(([employeeId, data]) => {
            if (!data?.status) return;
            records.push({
                date,
                employeeId,
                status: data.status,
                time: data.time || '',
                outTime: data.outTime || '',
                workTime: data.workTime || '',
                isBiometric: data.isBiometric || false
            });
        });
    });
    return records;
};

const getAttendanceMap = async () => {
    if (shouldUseMockStore()) return mockStore.mockAttendance;

    const data = await Attendance.find().lean();
    return data.reduce((map, record) => {
        if (!map[record.date]) map[record.date] = {};
        map[record.date][record.employeeId] = { 
            status: record.status, 
            time: record.time,
            outTime: record.outTime,
            workTime: record.workTime,
            isBiometric: record.isBiometric
        };
        return map;
    }, {});
};

const syncAttendanceRecords = async (records = []) => {
    if (shouldUseMockStore()) {
        records.forEach(rec => {
            if (!mockStore.mockAttendance[rec.date]) mockStore.mockAttendance[rec.date] = {};
            mockStore.mockAttendance[rec.date][rec.employeeId] = { 
                status: rec.status, time: rec.time, outTime: rec.outTime, workTime: rec.workTime, isBiometric: rec.isBiometric 
            };
        });
        return;
    }

    if (records.length === 0) return;

    await Attendance.bulkWrite(
        records.map(rec => ({
            updateOne: {
                filter: { date: rec.date, employeeId: rec.employeeId },
                update: { $set: rec },
                upsert: true
            }
        })),
        { ordered: false }
    );
};

router.get('/', async (req, res, next) => {
    try {
        if (shouldUseMockStore()) return res.json(mockStore.mockAttendance);
        if (!(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        res.json(await getAttendanceMap());
    } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
    try {
        const record = req.body;
        if (shouldUseMockStore()) {
            if (!mockStore.mockAttendance[record.date]) mockStore.mockAttendance[record.date] = {};
            mockStore.mockAttendance[record.date][record.employeeId] = { 
                status: record.status, time: record.time, outTime: record.outTime, workTime: record.workTime, isBiometric: record.isBiometric 
            };
        } else {
            if (!(await ensurePersistentStore())) {
                return await respondStorageUnavailable(res);
            }
            await Attendance.findOneAndUpdate(
                { date: record.date, employeeId: record.employeeId },
                record,
                { upsert: true, new: true }
            );
        }
        req.app.get('io').emit('state_changed', { type: 'attendance' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

router.post('/bulk', async (req, res, next) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'records must be an array.' });
        }

        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        await syncAttendanceRecords(records);
        req.app.get('io').emit('state_changed', { type: 'attendance' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

router.post('/sync/etimeoffice', async (req, res, next) => {
    try {
        const { date, preview } = req.body;
        if (!date) return res.status(400).json({ error: 'date is required' });
        
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        const result = await syncBiometricAttendance(date, req.app.get('io'), preview);
        if (result.success) {
            res.json({ success: true, count: result.count, records: result.records });
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (e) { next(e); }
});

module.exports = { route: router, getAttendanceMap, syncAttendanceRecords, attendanceMapToRecords };
