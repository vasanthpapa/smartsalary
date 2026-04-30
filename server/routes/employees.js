const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const mockStore = require('../config/mockStore');
const { shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');
const axios = require('axios');
const { getBiometricConfigs, getBiometricCredentials } = require('../services/biometricSync');

const getEmployees = async () => {
    if (shouldUseMockStore()) return mockStore.mockEmployees;

    const employees = await Employee.find().sort({ name: 1 }).lean();
    if (employees.length > 0) return employees;

    await Employee.insertMany(mockStore.mockEmployees, { ordered: true });
    return await Employee.find().sort({ name: 1 }).lean();
};

const syncEmployees = async (employees = []) => {
    if (shouldUseMockStore()) {
        mockStore.mockEmployees = employees;
        return;
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

module.exports = { route: router, getEmployees, syncEmployees };
