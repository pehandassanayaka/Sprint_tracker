const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';

/**
 * Verifies the JWT in the Authorization header and attaches
 * the decoded user payload to req.user before calling next().
 *
 * Expects: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please log in.' });
    }

    const token = authHeader.slice(7); // strip "Bearer "
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.id, username: payload.username };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token. Please log in.' });
    }
};

module.exports = authMiddleware;
