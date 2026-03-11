// Role-based access control middleware

// Require admin role
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }

    next();
}

// Require specific roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
}

// Check job access based on role
async function checkJobAccess(req, res, next) {
    const { query: dbQuery } = require('../config/database');
    const jobId = req.params.id;

    if (!jobId) {
        return next();
    }

    try {
        const result = await dbQuery(
            'SELECT id, assigned_to FROM jobs WHERE id = $1',
            [jobId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Job not found.'
            });
        }

        const job = result.rows[0];

        // Admin can access all jobs
        if (req.user.role === 'admin') {
            req.job = job;
            return next();
        }

        // Staff can only access assigned jobs
        if (job.assigned_to !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You are not assigned to this job.'
            });
        }

        req.job = job;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = {
    requireAdmin,
    requireRole,
    checkJobAccess
};
