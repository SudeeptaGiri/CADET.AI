const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
// router.use(authMiddleware.protect);

// // Restrict to admin and interviewer
// router.use(authMiddleware.restrictTo('admin', 'interviewer'));

// Get all reports with filtering
router.get('/', reportController.getAllReports);

router.post('/', reportController.createReport);
router.get('/stats', reportController.getReportStats);
router.get('/interview/:interviewId', reportController.getReportsByInterview);
router.get('/candidate/:candidateId', reportController.getReportsByCandidate);
router.get('/:id', reportController.getReportById);
router.patch('/:id', reportController.updateReport);
router.delete('/:id', reportController.deleteReport);
router.post('/:interviewId/generate', reportController.generateAIReport);

module.exports = router;