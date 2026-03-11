const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// GET /api/logs - List all activity logs (paginated)
router.get('/', logsController.getAll);

module.exports = router;
