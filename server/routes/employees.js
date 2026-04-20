const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const mockStore = require('../config/mockStore');
const { shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');

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

module.exports = { route: router, getEmployees, syncEmployees };
