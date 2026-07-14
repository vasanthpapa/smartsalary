const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const mockStore = require('../config/mockStore');
const { shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');
const axios = require('axios');
const { getBiometricConfigs, getBiometricCredentials } = require('../services/biometricSync');

const getEmployees = async () => {
    let employees;
    if (shouldUseMockStore()) {
        employees = [...mockStore.mockEmployees];
    } else {
        employees = await Employee.find().lean();
        if (employees.length === 0 && mockStore.mockEmployees.length > 0) {
            await Employee.insertMany(mockStore.mockEmployees, { ordered: true });
            employees = await Employee.find().lean();
        }
    }
    employees.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }));
    return employees;
};

const syncEmployees = async (employees = []) => {
    if (shouldUseMockStore()) {
        mockStore.mockEmployees = [...employees].sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: 'base' }));
        return;
    }

    if (employees.length === 0) {
        const count = await Employee.countDocuments();
        if (count > 0) {
            console.warn('[Sync] Received empty employees array from client, but MongoDB has records. Skipping destructive sync.');
            return;
        }
    }

    await Employee.deleteMany({ id: { $nin: employees.map(emp => emp.id) } });

    if (employees.length === 0) {
        return;
    }

    await Employee.bulkWrite(
        employees.map(emp => ({
            updateOne: {
                filter: { id: emp.id },
                update: { $set: emp },
                upsert: true
            }
        })),
        { ordered: false }
    );
};

router.get('/', async (req, res, next) => {
    try {
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        res.json(await getEmployees());
    } catch (e) { next(e); }
});

router.post('/sync', async (req, res, next) => {
    try {
        const { employees } = req.body;
        if (!Array.isArray(employees)) {
            return res.status(400).json({ error: 'employees must be an array.' });
        }

        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        await syncEmployees(employees);
        req.app.get('io').emit('state_changed', { type: 'employees' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

router.get('/biometric-ids', async (req, res, next) => {
    try {
        const date = new Date();
        const apiDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        const configs = getBiometricConfigs();
        let uniqueBiometricIds = [];
        const seenIds = new Set();

        for (const config of configs) {
            const credentials = getBiometricCredentials(config);
            const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${apiDateStr}&ToDate=${apiDateStr}`;

            try {
                const response = await axios.get(url, { headers: { 'Authorization': credentials } });
                const data = response.data.InOutPunchData || [];

                data.forEach(record => {
                    if (!seenIds.has(record.Empcode)) {
                        seenIds.add(record.Empcode);
                        uniqueBiometricIds.push({
                            id: record.Empcode,
                            name: record.Name,
                            corpId: config.corpId
                        });
                    }
                });
            } catch (err) {
                console.error(`Error fetching biometric IDs from ${config.corpId}:`, err.message);
            }
        }

        // Sort by ID
        uniqueBiometricIds.sort((a, b) => a.id.localeCompare(b.id));

        res.json(uniqueBiometricIds);
    } catch (e) {
        next(e);
    }
});

router.post('/sync/biometric', async (req, res, next) => {
    try {
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        const date = new Date();
        const apiDateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        const configs = getBiometricConfigs();
        const biometricEmployees = [];
        const seenIds = new Set();

        for (const config of configs) {
            const credentials = getBiometricCredentials(config);
            const url = `https://api.etimeoffice.com/api/DownloadInOutPunchData?Empcode=ALL&FromDate=${apiDateStr}&ToDate=${apiDateStr}`;

            try {
                const response = await axios.get(url, { headers: { 'Authorization': credentials } });
                const data = response.data.InOutPunchData || [];

                data.forEach(record => {
                    if (record.Empcode && !seenIds.has(record.Empcode)) {
                        seenIds.add(record.Empcode);
                        biometricEmployees.push({
                            id: record.Empcode,
                            name: record.Name || `Biometric Employee ${record.Empcode}`,
                            role: 'Employee',
                            dept: 'Biometric',
                            salary: 0,
                            checkin: '09:00',
                            weekoffs: []
                        });
                    }
                });
            } catch (err) {
                console.error(`Error fetching biometric IDs from ${config.corpId}:`, err.message);
            }
        }

        if (biometricEmployees.length === 0) {
            return res.json({ success: true, count: 0, message: 'No biometric employees found active today.' });
        }

        // Fetch current employees to avoid overwriting existing metadata (role, dept, salary, checkin, weekoffs)
        let currentEmployees;
        if (shouldUseMockStore()) {
            currentEmployees = mockStore.mockEmployees;
        } else {
            currentEmployees = await Employee.find().lean();
        }

        const currentEmpMap = new Map(currentEmployees.map(e => [e.id, e]));
        const mergedEmployees = [];

        biometricEmployees.forEach(bioEmp => {
            const existing = currentEmpMap.get(bioEmp.id);
            if (existing) {
                // If it already exists, update name if it matches placeholder or if we want to ensure latest name, 
                // but keep all existing role, dept, salary, checkin, weekoffs etc.
                mergedEmployees.push({
                    ...existing,
                    name: existing.name || bioEmp.name
                });
            } else {
                mergedEmployees.push(bioEmp);
            }
        });

        // Also carry over current employees who are NOT in today's biometric list (so we don't delete them!)
        currentEmployees.forEach(currEmp => {
            if (!seenIds.has(currEmp.id)) {
                mergedEmployees.push(currEmp);
            }
        });

        await syncEmployees(mergedEmployees);
        req.app.get('io').emit('state_changed', { type: 'employees' });

        res.json({
            success: true,
            count: biometricEmployees.length,
            message: `Successfully synced ${biometricEmployees.length} employee(s) from biometric system.`
        });
    } catch (e) {
        next(e);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        let updatedEmployee;
        if (shouldUseMockStore()) {
            const idx = mockStore.mockEmployees.findIndex(e => e.id === id);
            if (idx !== -1) {
                const updateData = { ...req.body };
                delete updateData._id;
                delete updateData.id;
                mockStore.mockEmployees[idx] = { ...mockStore.mockEmployees[idx], ...updateData };
                updatedEmployee = mockStore.mockEmployees[idx];
            }
        } else {
            const updateData = { ...req.body };
            delete updateData._id;
            delete updateData.id;
            updatedEmployee = await Employee.findOneAndUpdate({ id }, updateData, { new: true });
        }

        if (!updatedEmployee) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        req.app.get('io').emit('state_changed', { type: 'employees' });
        res.json({ success: true, employee: updatedEmployee });
    } catch (e) {
        next(e);
    }
});

module.exports = { route: router, getEmployees, syncEmployees };