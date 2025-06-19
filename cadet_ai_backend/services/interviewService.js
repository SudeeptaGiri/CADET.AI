// interviewService.js
const Interview = require('../models/interviewModel');
const Question = require('../models/question.model');
const { evaluateAnswer } = require('../services/llmEvaluationService');
const { generateReport } = require('./reportService');

async function startInterview(userId) {
  try {
    const interview = new Interview({
      userId,
      startTime: new Date(),
      status: 'in-progress'
    });
    
    await interview.save();
    return interview;
  } catch (error) {
    console.error("Error starting interview:", error);
    throw new Error("Failed to start interview");
  }
}

async function submitAnswer(interviewId, questionId, answer) {
  try {
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    
    if (interview.status !== 'in-progress') {
      throw new Error("Interview is not in progress");
    }
    
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error("Question not found");
    }
    
    // Evaluate answer using LLM
    const evaluation = await evaluateAnswer(question.text, answer);
    
    // Store answer and evaluation
    const answerObj = {
      questionId,
      questionText: question.text,
      userAnswer: answer,
      correctnessScore: evaluation.score,
      feedback: evaluation.feedback,
      submittedAt: new Date()
    };
    
    interview.answers.push(answerObj);
    await interview.save();
    
    return {
      score: evaluation.score,
      feedback: evaluation.feedback
    };
  } catch (error) {
    console.error("Error submitting answer:", error);
    throw new Error("Failed to submit answer");
  }
}

async function completeInterview(interviewId) {
  try {
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }
    
    interview.status = 'completed';
    interview.endTime = new Date();
    
    // Generate final report
    const report = await generateReport(interview);
    interview.report = report;
    
    await interview.save();
    return report;
  } catch (error) {
    console.error("Error completing interview:", error);
    throw new Error("Failed to complete interview");
  }
}

module.exports = {
  startInterview,
  submitAnswer,
  completeInterview
};