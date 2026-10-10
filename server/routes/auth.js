const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', (req, res, next) => {
    try {
        if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET || JWT_SECRET.length < 32) {
            return res.status(503).json({
                error: 'Authentication is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and a JWT_SECRET of at least 32 characters.'
            });
        }

        const { username, password } = req.body || {};
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token });
        }

        return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
    } catch (e) { next(e); }
});

module.exports = { route: router, JWT_SECRET };
