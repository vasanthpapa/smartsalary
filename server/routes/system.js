const express = require('express');
const router = express.Router();
const { getStorageStatus, shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');
const { getEmployees, syncEmployees } = require('./employees');
const { getAttendanceMap, syncAttendanceRecords, attendanceMapToRecords } = require('./attendance');
const { getRulesConfig, syncRulesConfig } = require('./rules');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const getBootstrapPayload = async () => {
    const [storage, employees, attendance, rules] = await Promise.all([
        getStorageStatus(),
        getEmployees(),
        getAttendanceMap(),
        getRulesConfig()
    ]);
    return { storage, employees, attendance, rules };
};

router.get('/health', async (req, res, next) => {
    try {
        const storage = await getStorageStatus();
        res.json({ ok: true, storage });
    } catch (e) { next(e); }
});

router.get('/api/system/status', async (req, res, next) => {
    try {
        const storage = await getStorageStatus();
        res.json({ storage, environment: IS_PRODUCTION ? 'production' : 'development' });
    } catch (e) { next(e); }
});

router.get('/api/bootstrap', async (req, res, next) => {
    try {
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        res.json(await getBootstrapPayload());
    } catch (e) { next(e); }
});

router.post('/api/sync', async (req, res, next) => {
    try {
        const { employees = [], attendance = {}, rules = {} } = req.body;

        if (!Array.isArray(employees)) {
            return res.status(400).json({ error: 'employees must be an array.' });
        }

        if (!attendance || typeof attendance !== 'object' || Array.isArray(attendance)) {
            return res.status(400).json({ error: 'attendance must be an object.' });
        }

        if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
            return res.status(400).json({ error: 'rules must be an object.' });
        }

        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        const attendanceRecords = attendanceMapToRecords(attendance);

        await Promise.all([
            syncEmployees(employees),
            syncAttendanceRecords(attendanceRecords),
            syncRulesConfig(rules)
        ]);

        const payload = await getBootstrapPayload();
        req.app.get('io').emit('state_changed', { type: 'sync' });
        res.json({ success: true, ...payload });
    } catch (e) { next(e); }
});

module.exports = { route: router };
