const Session = require('../models/session.model');
const Question = require('../models/question.model');
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

// Map interview difficulty to question difficulty
function mapDifficulty(interviewDifficulty) {
  switch(interviewDifficulty.toLowerCase()) {
    case 'beginner':
      return 'Easy';
    case 'intermediate':
      return 'Medium';
    case 'advanced':
      return 'Hard';
    default:
      return 'Medium';
  }
}

// Create a new session
exports.createSession = async (req, res) => {
  try {
    const { userId, interviewId, initialTopic } = req.body;
    const token = req.headers?.authorization;
    
    // Get interview details from the external API
    const interview = await getInterviewDetails(interviewId, token);
    const interviewData = interview.data.interview;
    // Map interview difficulty to question difficulty
    const questionDifficulty = mapDifficulty(interviewData.difficulty);
    
    
    // Use the first topic from interview if initialTopic not provided
    const topic = initialTopic || (interviewData.topics.length > 0 ? interviewData.topics[0] : 'General');
    console.log('Topic:', topic);
    const session = new Session({
      userId,
      interviewId,
      currentTopic: topic,
      currentDifficulty: questionDifficulty,
      questionCount: 0,
      topicFailures: 0,
      answeredQuestions: []
    });
    
    await session.save();
    
    // Get the first question
    const firstQuestion = await Question.findOne({
      topic: session.currentTopic,
      difficulty: session.currentDifficulty
    });
    
    // If no question found with exact difficulty, try any difficulty
    let questionToReturn = firstQuestion;
    if (!questionToReturn) {
      questionToReturn = await Question.findOne({
        topic: session.currentTopic
      });
    }
    
    // If still no question, try first topic
    if (!questionToReturn && interviewData.topics.length > 0) {
      questionToReturn = await Question.findOne({
        topic: interviewData.topics[0]
      });
    }
    
    res.status(201).json({
      session,
      firstQuestion: questionToReturn
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating session', error: error.message });
  }
};

// Get session by ID
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching session', error: error.message });
  }
};

// Get user sessions
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user sessions', error: error.message });
  }
};

// Get interview sessions
exports.getInterviewSessions = async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const sessions = await Session.find({ interviewId }).sort({ createdAt: -1 });
    
    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching interview sessions', error: error.message });
  }
};

exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the session
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Mark as completed
    session.status = 'completed';
    await session.save();
    
    res.status(200).json(session);
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Error completing session', error: error.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Find and update the session
    const session = await Session.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.status(200).json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ message: 'Error updating session', error: error.message });
  }
};