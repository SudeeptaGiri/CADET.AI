// routes/questions.routes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');

// Get questions with filters
router.get('/', questionController.getQuestions);

// Get first question for a session
router.get('/first', questionController.getFirstQuestion);

// Get next question for a session
router.get('/next', questionController.getNextQuestion);

// Get question by ID - IMPORTANT: This must come after other specific routes
router.get('/:id', questionController.getQuestionById);

// Submit answer
router.post('/submit-answer', questionController.submitAnswer);

// Get next topic
router.get('/next-topic', questionController.getNextTopic);

module.exports = router;