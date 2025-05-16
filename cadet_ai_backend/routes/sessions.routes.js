const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authController = require('../controllers/authController');

// All routes require authentication
router.use(authController.protect);

// Create a new session
router.post('/', sessionController.createSession);

// Get session by ID
router.get('/:id', sessionController.getSessionById);

// Get user sessions
router.get('/user/:userId', sessionController.getUserSessions);

// Get interview sessions
router.get('/interview/:interviewId', sessionController.getInterviewSessions);

module.exports = router;