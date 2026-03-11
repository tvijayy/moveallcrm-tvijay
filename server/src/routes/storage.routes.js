const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Storage routes: admin only
router.use(authenticate);
router.use(requireAdmin);

router.get('/', storageController.getAll);
router.get('/:id', storageController.getById);
router.post('/', storageController.create);
router.put('/:id', storageController.update);
router.delete('/:id', storageController.delete);

module.exports = router;
