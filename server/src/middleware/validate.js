const { validationResult, body, param, query } = require('express-validator');

// Handle validation errors
function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
}

// Login validation
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidation
];

// User creation validation
const createUserValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required'),
    body('role')
        .isIn(['admin', 'staff'])
        .withMessage('Role must be admin or staff'),
    handleValidation
];

// Job creation validation
const createJobValidation = [
    body('customerName')
        .trim()
        .notEmpty()
        .withMessage('Customer name is required'),
    body('customerPhone')
        .trim()
        .notEmpty()
        .withMessage('Customer phone is required'),
    body('moveDate')
        .isISO8601()
        .withMessage('Valid move date is required'),
    body('fromLocation')
        .trim()
        .notEmpty()
        .withMessage('From location is required'),
    body('toLocation')
        .trim()
        .notEmpty()
        .withMessage('To location is required'),
    body('customerEmail')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email format required'),
    body('status')
        .optional()
        .isIn(['new', 'contacted', 'scheduled', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    body('assignedTo')
        .optional()
        .isUUID()
        .withMessage('Assigned user must be a valid UUID'),
    handleValidation
];

// Job update validation
const updateJobValidation = [
    body('customerName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Customer name cannot be empty'),
    body('customerPhone')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Customer phone cannot be empty'),
    body('moveDate')
        .optional()
        .isISO8601()
        .withMessage('Valid move date required'),
    body('status')
        .optional()
        .isIn(['new', 'contacted', 'scheduled', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    handleValidation
];

// Status update validation
const statusValidation = [
    body('status')
        .isIn(['new', 'contacted', 'scheduled', 'in_progress', 'completed', 'cancelled'])
        .withMessage('Invalid status'),
    handleValidation
];

// UUID param validation
const uuidParam = [
    param('id')
        .isUUID()
        .withMessage('Invalid ID format'),
    handleValidation
];

module.exports = {
    handleValidation,
    loginValidation,
    createUserValidation,
    createJobValidation,
    updateJobValidation,
    statusValidation,
    uuidParam
};
