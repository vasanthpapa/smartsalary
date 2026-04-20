const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'smartadmin@org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smart@6789';
const JWT_SECRET = process.env.JWT_SECRET || 'very-secure-workforce-secret-key-123';

router.post('/login', (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token });
        } else {
            res.status(401).json({ error: 'Invalid credentials. Please try again.' });
        }
    } catch (e) { next(e); }
});

module.exports = { route: router, JWT_SECRET };
