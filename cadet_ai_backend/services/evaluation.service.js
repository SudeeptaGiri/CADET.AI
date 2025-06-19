const Question = require('../models/question.model');
const Evaluation = require('../models/evaluation.model');
const logger = require('../utils/logger');

class EvaluationService {
  constructor(llmService) {
    this.llmService = llmService;
  }
  
  async evaluateAnswer(userId, sessionId, questionId, answer, responseTimeMs) {
    try {
      // Retrieve question details
      const question = await Question.findById(questionId);
      if (!question) {
        throw new Error(`Question not found: ${questionId}`);
      }
      
      // Construct prompt for evaluation
      const prompt = this.buildEvaluationPrompt(question, answer);
      
      // Get evaluation from LLM
      logger.info(`Sending answer for evaluation: userId=${userId}, questionId=${questionId}`);
      const evaluation = await this.llmService.getEvaluation(prompt);
      
      // Apply time-based penalties
      const timeAdjustedScore = this.applyTimePenalty(
        evaluation.score, 
        responseTimeMs, 
        question.difficulty, 
        question.expectedTimeMs
      );
      
      // Create evaluation result
      const result = new Evaluation({
        userId,
        sessionId,
        questionId,
        originalAnswer: answer,
        responseTimeMs,
        rawScore: evaluation.score,
        adjustedScore: timeAdjustedScore,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        keywordsCovered: evaluation.keywordsCovered,
        keywordsMissed: evaluation.keywordsMissed
      });
      
      // Store evaluation
      await result.save();
      logger.info(`Evaluation stored: userId=${userId}, questionId=${questionId}, score=${timeAdjustedScore}`);
      
      return result;
    } catch (error) {
      logger.error(`Error evaluating answer: ${error.message}`);
      throw error;
    }
  }
  
  buildEvaluationPrompt(question, answer) {
    return `
You are an expert evaluator for technical engineering interviews. 
Evaluate the following answer to this question:

QUESTION: ${question.text}

EXPECTED KEYWORDS: ${question.keywords.join(', ')}

USER ANSWER: ${answer}

Evaluate the answer on:
1. Correctness (1-10)
2. Relevance to the question (1-10)
3. Use of important keywords (list which ones were used and missed)
4. Depth of explanation (1-10)

Provide a JSON response with the following format:
{
  "score": <overall_score_1_to_10>,
  "correctness": <score_1_to_10>,
  "relevance": <score_1_to_10>,
  "depth": <score_1_to_10>,
  "feedback": "<concise_feedback>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "keywordsCovered": ["<keyword1>", "<keyword2>"],
  "keywordsMissed": ["<keyword1>", "<keyword2>"]
}
`;
  }
  
  applyTimePenalty(score, actualTimeMs, difficulty, expectedTimeMs) {
    const timeRatio = actualTimeMs / expectedTimeMs;
    
    // Penalty thresholds by difficulty
    const penaltyThresholds = {
      easy: 1.5,    // 50% longer than expected
      medium: 1.7,  // 70% longer than expected
      hard: 2.0     // 100% longer than expected (more lenient)
    };
    
    // Penalty multipliers (how severe the penalty is)
    const penaltyMultipliers = {
      easy: 2.0,    // Stricter for easy questions
      medium: 1.5,  // Moderate for medium questions
      hard: 1.0     // Lenient for hard questions
    };
    
    // Apply penalty only if time exceeds threshold
    if (timeRatio > penaltyThresholds[difficulty]) {
      const penaltyPoints = (timeRatio - penaltyThresholds[difficulty]) * penaltyMultipliers[difficulty];
      return Math.max(score - penaltyPoints, 1); // Ensure score doesn't go below 1
    }
    
    return score; // No penalty
  }
}

module.exports = EvaluationService;