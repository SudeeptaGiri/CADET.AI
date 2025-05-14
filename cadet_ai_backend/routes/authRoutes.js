const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Interview access
router.post('/interview-access', authController.interviewAccess);

// Protected routes
router.use(authController.protect);
router.patch('/updateMyPassword', authController.updatePassword);

module.exports = router;