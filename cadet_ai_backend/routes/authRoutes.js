// routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Admin routes
router.post('/admin/signup', authController.adminSignup);
router.post('/admin/login', authController.adminLogin);

// Interview access for candidates
router.post('/interview-access', authController.interviewAccess);

// Protected routes
// router.use(authController.protect);

module.exports = router;