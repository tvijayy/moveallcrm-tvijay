const express = require('express');
const router = express.Router();
const contactsController = require('../controllers/contacts.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Contacts routes: admin only
router.use(authenticate);
router.use(requireAdmin);

router.get('/', contactsController.getAll);
router.get('/:id', contactsController.getById);
router.post('/', contactsController.create);
router.put('/:id', contactsController.update);
router.delete('/:id', contactsController.delete);

module.exports = router;
