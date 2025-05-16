

const Report = require('../models/report.model');
const Evaluation = require('../models/evaluation.model');
const Question = require('../models/question.model');
const logger = require('../utils/logger');

class ReportService {
  constructor(llmService) {
    this.llmService = llmService;
  }
  
  async generateInterviewReport(userId, sessionId) {
    try {
      logger.info(`Generating interview report: userId=${userId}, sessionId=${sessionId}`);
      
      // Check if report already exists
      const existingReport = await Report.findOne({ sessionId });
      if (existingReport) {
        logger.info(`Report already exists for session: ${sessionId}`);
        return existingReport;
      }
      
      // Fetch all evaluations for this session
      const evaluations = await Evaluation.find({ userId, sessionId }).sort({ timestamp: 1 });
      
      if (evaluations.length === 0) {
        throw new Error(`No evaluations found for session: ${sessionId}`);
      }
      
      // Get questions for the evaluations
      const questionIds = evaluations.map(e => e.questionId);
      const questions = await Question.find({ _id: { $in: questionIds } });
      
      // Create map of question ID to question
      const questionMap = new Map();
      questions.forEach(q => questionMap.set(q._id.toString(), q));
      
      // Add question data to evaluations
      const evaluationsWithQuestions = evaluations.map(e => ({
        ...e.toObject(),
        question: questionMap.get(e.questionId.toString())
      }));
      
      // Calculate overall statistics
      const overallStats = this.calculateOverallStats(evaluations);
      
      // Identify strengths and weaknesses
      const topicAnalysis = this.analyzeTopicPerformance(evaluationsWithQuestions);
      
      // Generate improvement suggestions using LLM
      const improvementSuggestions = await this.generateImprovementSuggestions(
        topicAnalysis.weakTopics,
        overallStats
      );
      
      // Create final report
      const report = new Report({
        userId,
        sessionId,
        overallScore: overallStats.averageScore,
        questionCount: evaluations.length,
        timeStats: {
          totalTimeMs: overallStats.totalTimeMs,
          averageTimePerQuestionMs: overallStats.averageTimeMs,
          fastestResponseMs: overallStats.fastestResponseMs,
          slowestResponseMs: overallStats.slowestResponseMs
        },
        strengths: topicAnalysis.strongTopics.map(topic => ({
          topic: topic.name,
          averageScore: topic.averageScore,
          keyInsights: topic.keyInsights
        })),
        weaknesses: topicAnalysis.weakTopics.map(topic => ({
          topic: topic.name,
          averageScore: topic.averageScore,
          keyInsights: topic.keyInsights
        })),
        improvementSuggestions,
        detailedQuestionAnalysis: evaluations.map(e => ({
          questionId: e.questionId,
          score: e.adjustedScore,
          responseTimeMs: e.responseTimeMs,
          strengths: e.strengths,
          weaknesses: e.weaknesses
        }))
      });
      
      // Store the report
      await report.save();
      logger.info(`Report generated and stored: userId=${userId}, sessionId=${sessionId}`);
      
      return report;
    } catch (error) {
      logger.error(`Error generating interview report: ${error.message}`);
      throw error;
    }
  }
  
  calculateOverallStats(evaluations) {
    const scores = evaluations.map(e => e.adjustedScore);
    const times = evaluations.map(e => e.responseTimeMs);
    
    return {
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      totalTimeMs: times.reduce((sum, time) => sum + time, 0),
      averageTimeMs: times.reduce((sum, time) => sum + time, 0) / times.length,
      fastestResponseMs: Math.min(...times),
      slowestResponseMs: Math.max(...times)
    };
  }
  
  analyzeTopicPerformance(evaluations) {
    // Group by topic
    const topicMap = new Map();
    
    for (const evaluation of evaluations) {
      if (!evaluation.question) continue;
      
      const topic = evaluation.question.topic;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic).push(evaluation);
    }
    
    // Calculate per-topic stats
    const topicStats = [];
    
    for (const [topic, evals] of topicMap.entries()) {
      const scores = evals.map(e => e.adjustedScore);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Extract common strengths and weaknesses
      const strengths = this.findCommonElements(evals.flatMap(e => e.strengths));
      const weaknesses = this.findCommonElements(evals.flatMap(e => e.weaknesses));
      
      topicStats.push({
        name: topic,
        averageScore: avgScore,
        evaluationCount: evals.length,
        keyInsights: [...strengths, ...weaknesses]
      });
    }
    
    // Sort by score
    topicStats.sort((a, b) => b.averageScore - a.averageScore);
    
    // Split into strong and weak topics
    const midpoint = Math.floor(topicStats.length / 2);
    
    return {
      strongTopics: topicStats.slice(0, midpoint),
      weakTopics: topicStats.slice(midpoint)
    };
  }
  
  findCommonElements(items) {
    const frequency = new Map();
    
    for (const item of items) {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    }
    
    // Return items that appear more than once, sorted by frequency
    return [...frequency.entries()]
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([item, _]) => item)
      .slice(0, 3); // Top 3 most common
  }
  
  async generateImprovementSuggestions(weakTopics, overallStats) {
    try {
      const prompt = `
Based on this interview performance data:
- Overall score: ${overallStats.averageScore.toFixed(1)}/10
- Weak topics: ${weakTopics.map(t => `${t.name} (score: ${t.averageScore.toFixed(1)})`).join(', ')}
- Key weaknesses: ${weakTopics.flatMap(t => t.keyInsights).join(', ')}

Generate 3-5 specific, actionable improvement suggestions for the candidate.
Each suggestion should be concise (1-2 sentences) and directly address the weak areas.
Format each suggestion as a bullet point.
`;

      const response = await this.llmService.getImprovement(prompt);
      return response.suggestions;
    } catch (error) {
      logger.error(`Error generating improvement suggestions: ${error.message}`);
      
      // Return default suggestions if LLM fails
      return [
        "Review core concepts in your weaker topics.",
        "Practice explaining technical concepts clearly and concisely.",
        "Time yourself when answering practice questions to improve speed.",
        "Focus on understanding fundamentals before advanced topics."
      ];
    }
  }
  
  async getUserReports(userId) {
    try {
      return await Report.find({ userId }).sort({ timestamp: -1 });
    } catch (error) {
      logger.error(`Error getting user reports: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ReportService;