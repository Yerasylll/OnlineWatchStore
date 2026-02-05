const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { users, toObjectId } = require('../models/collections');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Development-only fallback: accept email/password headers for quick testing
    if (!token) {
        if (process.env.NODE_ENV === 'development' && req.headers.email && req.headers.password) {
            try {
                const user = await users().findOne({ email: req.headers.email.toLowerCase() });
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }

                const isMatch = await bcrypt.compare(req.headers.password, user.password);
                if (!isMatch) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }

                req.user = {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                return next();
            } catch (err) {
                return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
            }
        }

        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await users().findOne(
            { _id: toObjectId(decoded.id) },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};