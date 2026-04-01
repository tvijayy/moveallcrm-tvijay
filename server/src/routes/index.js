const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const leadsRoutes = require('./leads.routes');
const jobsRoutes = require('./jobs.routes');
const storageRoutes = require('./storage.routes');
const contactsRoutes = require('./contacts.routes');
const contractorsRoutes = require('./contractors.routes');
const usersRoutes = require('./users.routes');
const logsRoutes = require('./logs.routes');
const webhooksRoutes = require('./webhooks.routes');
const dropdownRoutes  = require('./dropdown.routes');
const commentsRoutes  = require('./comments.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/leads', leadsRoutes);
router.use('/jobs', jobsRoutes);
router.use('/storage', storageRoutes);
router.use('/contacts', contactsRoutes);
router.use('/contractors', contractorsRoutes);
router.use('/users', usersRoutes);
router.use('/logs', logsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/dropdown-options', dropdownRoutes);
router.use('/', commentsRoutes);

module.exports = router;
