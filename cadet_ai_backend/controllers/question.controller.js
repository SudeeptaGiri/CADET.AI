const Question = require('../models/question.model');
const Session = require('../models/session.model');
const axios = require('axios');

// Helper function to get interview details
async function getInterviewDetails(interviewId, token) {
  try {
    const response = await axios.get(`http://localhost:5000/api/interviews/${interviewId}`, {
      headers: {
        'Authorization': token
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching interview details', error);
    throw error;
  }
}

// Map interview difficulty to question difficulty with better matching
function mapDifficulty(interviewDifficulty) {
  const difficulty = interviewDifficulty?.toLowerCase() || '';
  
  if (difficulty.includes('begin') || difficulty.includes('easy')) {
    return 'Easy';
  } else if (difficulty.includes('advanc') || difficulty.includes('hard')) {
    return 'Hard';
  } else {
    return 'Medium'; // Default to Medium for intermediate or unknown
  }
}

// Map topic name to ensure it matches database entries
async function findMatchingTopic(requestedTopic) {
  // First try exact match
  const exactMatch = await Question.findOne({ topic: requestedTopic });
  if (exactMatch) return requestedTopic;
  
  // Try case-insensitive match
  const caseInsensitiveMatch = await Question.findOne({ 
    topic: { $regex: new RegExp('^' + requestedTopic + '$', 'i') } 
  });
  if (caseInsensitiveMatch) return caseInsensitiveMatch.topic;
  
  // Try partial match
  const partialMatch = await Question.findOne({
    topic: { $regex: new RegExp(requestedTopic, 'i') }
  });
  if (partialMatch) return partialMatch.topic;
  
  // If all else fails, get any available topic
  const anyQuestion = await Question.findOne({});
  return anyQuestion ? anyQuestion.topic : requestedTopic;
}

// Get questions with filters
exports.getQuestions = async (req, res) => {
  try {
    const { topic, category, difficulty } = req.query;
    const filter = {};
    
    if (topic) {
      // Use regex for case-insensitive topic matching
      filter.topic = { $regex: new RegExp(topic, 'i') };
    }
    
    if (category) {
      // Use regex for case-insensitive category matching
      filter.category = { $regex: new RegExp(category, 'i') };
    }
    
    if (difficulty) {
      // Use regex for case-insensitive difficulty matching
      filter.difficulty = { $regex: new RegExp(difficulty, 'i') };
    }
    
    const questions = await Question.find(filter);
    
    // Log the query and result count for debugging
    console.log(`Query: ${JSON.stringify(filter)}, Found: ${questions.length} questions`);
    
    res.status(200).json(questions);
  } catch (error) {
    console.error('Error in getQuestions:', error);
    res.status(500).json({ message: 'Error fetching questions', error: error.message });
  }
};

// Get question by ID with follow-ups
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate('followUps');
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.status(200).json(question);
  } catch (error) {
    console.error('Error in getQuestionById:', error);
    res.status(500).json({ message: 'Error fetching question', error: error.message });
  }
};

// Submit answer and get next question
// Modify your existing submitAnswer method in question.controller.js

exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, answer, sessionId, isCorrect } = req.body;
    const token = req.headers.authorization;
    
    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get interview details to access topics
    const interview = await getInterviewDetails(session.interviewId, token);
    
    // Evaluate the answer if not provided
    let answerIsCorrect = isCorrect;
    if (answerIsCorrect === undefined) {
      if (question.category === 'Theoretical') {
        // For theoretical questions, check if answer contains keywords
        answerIsCorrect = question.keywords.some(keyword => 
          answer.toLowerCase().includes(keyword.toLowerCase())
        );
      } else {
        // For coding questions, assume evaluation is done client-side
        answerIsCorrect = false;
      }
    }
    
    // Update session with answer
    session.answeredQuestions.push({
      questionId: question._id,
      correct: answerIsCorrect,
      userAnswer: answer
    });
    
    session.questionCount++;
    
    // Logic for next question
    if (answerIsCorrect) {
      // If correct, increase difficulty if possible
      if (session.currentDifficulty === 'Easy') {
        session.currentDifficulty = 'Medium';
      } else if (session.currentDifficulty === 'Medium') {
        session.currentDifficulty = 'Hard';
      }
      
      // Reset topic failures
      session.topicFailures = 0;
    } else {
      // If incorrect, increment failures
      session.topicFailures++;
      
      // If too many failures, switch topic
      if (session.topicFailures >= 3) {
        // Get next topic from interview topics
        const interviewTopics = interview?.data?.interview?.topics || [];
        if (interviewTopics.length > 0) {
          const currentIndex = interviewTopics.indexOf(session.currentTopic);
          const nextIndex = (currentIndex + 1) % interviewTopics.length;
          session.currentTopic = interviewTopics[nextIndex];
        }
        session.topicFailures = 0;
        session.currentDifficulty = mapDifficulty(interview?.data?.interview?.difficulty || 'Medium');
      }
    }
    
    await session.save();
    
    // Get next question
    // Get answered question IDs to exclude them
    const answeredQuestionIds = session.answeredQuestions.map(q => q.questionId);
    const skippedQuestionIds = session.skippedQuestions || [];
    const excludedQuestionIds = [...answeredQuestionIds, ...skippedQuestionIds];
    
    // Try to find a question in the same topic that hasn't been answered
    let nextQuestion = await Question.findOne({
      topic: session.currentTopic,
      difficulty: session.currentDifficulty,
      _id: { $nin: excludedQuestionIds }
    });
    
    // If no question found, try with any difficulty in the same topic
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: session.currentTopic,
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If still no question, try case-insensitive search
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: { $regex: new RegExp(session.currentTopic, 'i') },
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If still no question, switch to next topic
    if (!nextQuestion) {
      const interviewTopics = interview?.data?.interview?.topics || [];
      
      if (interviewTopics.length > 0) {
        const currentIndex = interviewTopics.indexOf(session.currentTopic);
        const nextIndex = (currentIndex + 1) % interviewTopics.length;
        session.currentTopic = interviewTopics[nextIndex];
        
        // Try to find a question in the new topic
        nextQuestion = await Question.findOne({
          topic: session.currentTopic,
          _id: { $nin: excludedQuestionIds }
        });
      }
    }
    
    // Last resort: get any unanswered question
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If we've exhausted all questions, start reusing them
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({});
    }
    
    // Update session with current question ID
    if (nextQuestion) {
      session.currentQuestionId = nextQuestion._id;
      await session.save();
    }
    
    res.status(200).json({
      isCorrect: answerIsCorrect,
      nextQuestion,
      session
    });
  } catch (error) {
    console.error('Error in submitAnswer:', error);
    res.status(500).json({ message: 'Error submitting answer', error: error.message });
  }
};

// Get next topic
exports.getNextTopic = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const token = req.headers.authorization;
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get interview details to access topics
    const interview = await getInterviewDetails(session.interviewId, token);
    const interviewTopics = interview?.data?.interview?.topics || [];
    
    if (!interviewTopics || interviewTopics.length === 0) {
      // If no topics in interview, get any available topic from questions
      const anyQuestion = await Question.findOne({});
      if (!anyQuestion) {
        return res.status(404).json({ message: 'No questions available in the database' });
      }
      
      session.currentTopic = anyQuestion.topic;
      session.topicFailures = 0;
      session.currentDifficulty = anyQuestion.difficulty;
      
      await session.save();
      
      return res.status(200).json({
        newTopic: session.currentTopic,
        nextQuestion: anyQuestion,
        session
      });
    }
    
    // Get next topic from interview topics
    const currentIndex = interviewTopics.indexOf(session.currentTopic);
    const nextIndex = (currentIndex + 1) % interviewTopics.length;
    const nextTopicRequest = interviewTopics[nextIndex];
    
    // Make sure next topic exists in the database
    const validNextTopic = await findMatchingTopic(nextTopicRequest);
    
    session.currentTopic = validNextTopic;
    session.topicFailures = 0;
    session.currentDifficulty = mapDifficulty(interview.data.interview.difficulty);
    
    await session.save();
    
    // Get a question from the new topic
    let nextQuestion = await Question.findOne({
      topic: validNextTopic,
      difficulty: session.currentDifficulty
    });
    
    // If no question with specific difficulty, try any difficulty
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: validNextTopic
      });
    }
    
    // If still no question, try case-insensitive search
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: { $regex: new RegExp(validNextTopic, 'i') }
      });
    }
    
    // Last resort: get any question
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({});
      if (nextQuestion) {
        session.currentTopic = nextQuestion.topic;
      }
      await session.save();
    }
    
    if (!nextQuestion) {
      return res.status(404).json({ message: 'No questions available for the selected topic' });
    }
    
    res.status(200).json({
      newTopic: session.currentTopic,
      nextQuestion,
      session
    });
  } catch (error) {
    console.error('Error in getNextTopic:', error);
    res.status(500).json({ message: 'Error switching topics', error: error.message });
  }
};

/**
 * Get the first question for a session
 */
exports.getFirstQuestion = async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get interview details to access topics and difficulty
    const token = req.headers.authorization;
    const interview = await getInterviewDetails(session.interviewId, token);
    const interviewTopics = interview?.data?.interview?.topics || [];
    
    // Determine the topic to use
    let topic = session.currentTopic;
    if (!topic && interviewTopics.length > 0) {
      topic = interviewTopics[0];
      session.currentTopic = topic;
    }
    
    // Determine the difficulty
    const difficulty = session.currentDifficulty || 
      mapDifficulty(interview?.data?.interview?.difficulty || 'Medium');
    
    // Find a question matching the topic and difficulty
    let question = await Question.findOne({
      topic: topic,
      difficulty: difficulty
    });
    
    // If no exact match, try with just the topic
    if (!question && topic) {
      question = await Question.findOne({ topic: topic });
    }
    
    // If still no match, try case-insensitive search
    if (!question && topic) {
      question = await Question.findOne({ 
        topic: { $regex: new RegExp(topic, 'i') }
      });
    }
    
    // Last resort: get any question
    if (!question) {
      question = await Question.findOne({});
      
      // Update session with the topic from the found question
      if (question) {
        session.currentTopic = question.topic;
      }
    }
    
    if (!question) {
      return res.status(404).json({ message: 'No questions available' });
    }
    
    // Update session with current question ID
    session.currentQuestionId = question._id;
    await session.save();
    
    res.status(200).json(question);
  } catch (error) {
    console.error('Error in getFirstQuestion:', error);
    res.status(500).json({ message: 'Error fetching question', error: error.message });
  }
};

/**
 * Get the next question for a session
 */
exports.getNextQuestion = async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }
    
    // Find the session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get interview details
    const token = req.headers.authorization;
    const interview = await getInterviewDetails(session.interviewId, token);
    
    // Get answered question IDs to exclude them
    const answeredQuestionIds = session.answeredQuestions.map(q => q.questionId);
    const skippedQuestionIds = session.skippedQuestions || [];
    const excludedQuestionIds = [...answeredQuestionIds, ...skippedQuestionIds];
    
    // Try to find a question in the same topic that hasn't been answered
    let nextQuestion = await Question.findOne({
      topic: session.currentTopic,
      difficulty: session.currentDifficulty,
      _id: { $nin: excludedQuestionIds }
    });
    
    // If no question found, try with any difficulty in the same topic
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: session.currentTopic,
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If still no question, try case-insensitive search
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        topic: { $regex: new RegExp(session.currentTopic, 'i') },
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If still no question, switch to next topic
    if (!nextQuestion) {
      const interviewTopics = interview?.data?.interview?.topics || [];
      
      if (interviewTopics.length > 0) {
        const currentIndex = interviewTopics.indexOf(session.currentTopic);
        const nextIndex = (currentIndex + 1) % interviewTopics.length;
        session.currentTopic = interviewTopics[nextIndex];
        
        // Try to find a question in the new topic
        nextQuestion = await Question.findOne({
          topic: session.currentTopic,
          _id: { $nin: excludedQuestionIds }
        });
      }
    }
    
    // Last resort: get any unanswered question
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({
        _id: { $nin: excludedQuestionIds }
      });
    }
    
    // If we've exhausted all questions, start reusing them
    if (!nextQuestion) {
      nextQuestion = await Question.findOne({});
    }
    
    if (!nextQuestion) {
      return res.status(404).json({ message: 'No more questions available' });
    }
    
    // Update session with current question ID
    session.currentQuestionId = nextQuestion._id;
    await session.save();
    
    res.status(200).json(nextQuestion);
  } catch (error) {
    console.error('Error in getNextQuestion:', error);
    res.status(500).json({ message: 'Error fetching next question', error: error.message });
  }
};