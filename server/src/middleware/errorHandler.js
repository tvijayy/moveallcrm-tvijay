// Global error handler middleware

function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // PostgreSQL specific errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                return res.status(409).json({
                    success: false,
                    error: 'A record with this value already exists.'
                });
            case '23503': // Foreign key violation
                return res.status(400).json({
                    success: false,
                    error: 'Referenced record does not exist.'
                });
            case '22P02': // Invalid UUID
                return res.status(400).json({
                    success: false,
                    error: 'Invalid ID format.'
                });
            case '23502': // Not null violation
                return res.status(400).json({
                    success: false,
                    error: 'Required field is missing.'
                });
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token.'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token has expired.'
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;
