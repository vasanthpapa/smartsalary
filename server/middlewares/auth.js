const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) {
        return res.status(403).json({ error: 'Access denied. No token provided.' });
    }

    const token = bearerHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ error: 'Access denied. Malformed token string.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = verifyToken;
