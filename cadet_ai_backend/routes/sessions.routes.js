const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authController = require('../controllers/authController');

// All routes require authentication
router.use(authController.protect);

router.post('/', sessionController.createSession);

// Get session by ID
router.get('/:id', sessionController.getSessionById);

// Update session
router.patch('/:id', sessionController.updateSession);

// Complete session
router.post('/:id/complete', sessionController.completeSession);

// Get user sessions
router.get('/user/:userId', sessionController.getUserSessions);

// Get interview sessions
router.get('/interview/:interviewId', sessionController.getInterviewSessions);

module.exports = router;