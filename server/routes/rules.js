const express = require('express');
const router = express.Router();
const Rules = require('../models/Rules');
const mockStore = require('../config/mockStore');
const { shouldUseMockStore, ensurePersistentStore, respondStorageUnavailable } = require('../config/db');

const getRulesConfig = async () => {
    if (shouldUseMockStore()) return mockStore.mockRules;

    const rules = await Rules.findOne().lean();
    return rules || mockStore.mockRules;
};

const syncRulesConfig = async (rules = {}) => {
    if (shouldUseMockStore()) {
        Object.assign(mockStore.mockRules, rules);
        return;
    }

    await Rules.findOneAndUpdate({}, rules, { upsert: true });
};

router.get('/', async (req, res, next) => {
    try {
        if (shouldUseMockStore()) return res.json(mockStore.mockRules);
        if (!(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }
        res.json(await getRulesConfig());
    } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
    try {
        if (!shouldUseMockStore() && !(await ensurePersistentStore())) {
            return await respondStorageUnavailable(res);
        }

        await syncRulesConfig(req.body);
        req.app.get('io').emit('state_changed', { type: 'rules' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

module.exports = { route: router, getRulesConfig, syncRulesConfig };
