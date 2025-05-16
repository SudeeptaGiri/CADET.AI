const logger = require('../utils/logger');

class InterviewController {
  constructor(sessionService, questioningService, evaluationService, reportService) {
    this.sessionService = sessionService;
    this.questioningService = questioningService;
    this.evaluationService = evaluationService;
    this.reportService = reportService;
  }
  
  async startSession(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const session = await this.sessionService.startSession(userId);
      
      res.status(201).json({
        success: true,
        data: { session }
      });
    } catch (error) {
      logger.error(`Error in startSession: ${error.message}`);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }
  
  async getNextQuestion(req, res) {
    try {
      const { userId, sessionId } = req.params;
      
      if (!userId || !sessionId) {
        return res.status(400).json({ error: 'userId and sessionId are required' });
      }
      
      // Check if session exists and is active
      const session = await this.sessionService.getSession(sessionId);
      
      if (session.status !== 'active') {
        return res.status(400).json({ error: 'Session is not active' });
      }
      
      // Get next question
      const question = await this.questioningService.selectNextQuestion(userId, sessionId);
      
      // Update question count
      await this.sessionService.updateQuestionCount(sessionId, (session.questionCount || 0) + 1);
      
      res.status(200).json({
        success: true,
        data: { question }
      });
    } catch (error) {
      logger.error(`Error in getNextQuestion: ${error.message}`);
      res.status(500).json({ error: 'Failed to get next question' });
    }
  }
  
  async submitAnswer(req, res) {
    try {
      const { userId, sessionId, questionId, answer, responseTimeMs } = req.body;
      
      if (!userId || !sessionId || !questionId || !answer || responseTimeMs === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Check if session exists and is active
      const session = await this.sessionService.getSession(sessionId);
      
      if (session.status !== 'active') {
        return res.status(400).json({ error: 'Session is not active' });
      }
      
      // Evaluate answer
      const evaluation = await this.evaluationService.evaluateAnswer(
        userId,
        sessionId,
        questionId,
        answer,
        responseTimeMs
      );
      
      res.status(200).json({
        success: true,
        data: { evaluation }
      });
    } catch (error) {
      logger.error(`Error in submitAnswer: ${error.message}`);
      res.status(500).json({ error: 'Failed to evaluate answer' });
    }
  }
  
  async endSession(req, res) {
    try {
      const { userId, sessionId } = req.params;
      
      if (!userId || !sessionId) {
        return res.status(400).json({ error: 'userId and sessionId are required' });
      }
      
      // End session
      await this.sessionService.endSession(userId, sessionId);
      
      // Generate report
      const report = await this.reportService.generateInterviewReport(userId, sessionId);
      
      res.status(200).json({
        success: true,
        data: { report }
      });
    } catch (error) {
      logger.error(`Error in endSession: ${error.message}`);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }
  
  async getReport(req, res) {
    try {
      const { sessionId, userId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      
      // Get report
      const report = await this.reportService.generateInterviewReport(userId, sessionId);
      
      res.status(200).json({
        success: true,
        data: { report }
      });
    } catch (error) {
      logger.error(`Error in getReport: ${error.message}`);
      res.status(500).json({ error: 'Failed to get report' });
    }
  }
  
  async getUserSessions(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      // Get sessions
      const sessions = await this.sessionService.getUserSessions(userId);
      
      res.status(200).json({
        success: true,
        data: { sessions }
      });
    } catch (error) {
      logger.error(`Error in getUserSessions: ${error.message}`);
      res.status(500).json({ error: 'Failed to get user sessions' });
    }
  }
  
  async getUserReports(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      // Get reports
      const reports = await this.reportService.getUserReports(userId);
      
      res.status(200).json({
        success: true,
        data: { reports }
      });
    } catch (error) {
      logger.error(`Error in getUserReports: ${error.message}`);
      res.status(500).json({ error: 'Failed to get user reports' });
    }
  }
}

module.exports = InterviewController;