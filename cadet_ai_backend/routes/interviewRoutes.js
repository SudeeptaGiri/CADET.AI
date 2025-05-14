const express = require('express');
const interviewController = require('../controllers/interviewController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Get available topics and interview types
router.get('/topics', interviewController.getAvailableTopics);
router.get('/types', interviewController.getInterviewTypes);

// Interview routes
router.route('/')
  .get(interviewController.getAllInterviews)
  .post(authController.restrictTo('admin', 'interviewer'), interviewController.createInterview);

router.route('/:id')
  .get(interviewController.getInterview)
  .patch(authController.restrictTo('admin', 'interviewer'), interviewController.updateInterview)
  .delete(authController.restrictTo('admin', 'interviewer'), interviewController.deleteInterview);

// Cancel interview
router.patch('/:id/cancel', authController.restrictTo('admin', 'interviewer'), interviewController.cancelInterview);

// Get interview credentials
router.get('/:id/credentials', authController.restrictTo('admin', 'interviewer'), interviewController.getInterviewCredentials);

module.exports = router;