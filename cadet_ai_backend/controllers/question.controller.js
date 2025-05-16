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
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, answer, sessionId } = req.body;
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
    const interviewResponse = await getInterviewDetails(session.interviewId, token);
    const interview = interviewResponse.data.interview;
    
    // Evaluate the answer
    let isCorrect = false;
    let nextQuestion = null;
    
    if (question.category === 'Theoretical' || question.category.toLowerCase() === 'general') {
      // For theoretical questions, check if answer contains keywords
      isCorrect = question.keywords && question.keywords.some(keyword => 
        answer.toLowerCase().includes(keyword.toLowerCase())
      );
    } else {
      // For coding questions, assume evaluation is done client-side for now
      isCorrect = req.body.isCorrect || false;
    }
    
    // Update session with answer
    session.answeredQuestions.push({
      questionId: question._id,
      correct: isCorrect,
      userAnswer: answer
    });
    
    session.questionCount++;
    
    // Get answered question IDs for exclusion
    const answeredIds = session.answeredQuestions.map(q => q.questionId);
    
    // Make sure current topic exists in the database
    const validTopic = await findMatchingTopic(session.currentTopic);
    session.currentTopic = validTopic;
    
    // Logic for next question
    if (isCorrect) {
      // If correct, increase difficulty if possible
      if (session.currentDifficulty === 'Easy') {
        session.currentDifficulty = 'Medium';
      } else if (session.currentDifficulty === 'Medium') {
        session.currentDifficulty = 'Hard';
      }
      
      // Reset topic failures
      session.topicFailures = 0;
      
      // Check if there are follow-ups
      if (question.followUps && question.followUps.length > 0) {
        nextQuestion = await Question.findById(question.followUps[0]);
      }
      
      // If no follow-up found, get a new question
      if (!nextQuestion) {
        // Try to get a question with the same topic and higher difficulty
        nextQuestion = await Question.findOne({
          topic: validTopic,
          difficulty: session.currentDifficulty,
          _id: { $nin: answeredIds }
        });
        
        console.log(`Looking for next question with topic: ${validTopic}, difficulty: ${session.currentDifficulty}`);
      }
    } else {
      // If incorrect, increment failures
      session.topicFailures++;
      
      // If too many failures, switch topic
      if (session.topicFailures >= 3 && interview.topics && interview.topics.length > 1) {
        // Get next topic from interview topics
        const currentIndex = interview.topics.indexOf(session.currentTopic);
        const nextIndex = (currentIndex + 1) % interview.topics.length;
        const nextTopic = interview.topics[nextIndex];
        
        // Make sure next topic exists in the database
        session.currentTopic = await findMatchingTopic(nextTopic);
        session.topicFailures = 0;
        session.currentDifficulty = mapDifficulty(interview.difficulty);
        
        console.log(`Switching to topic: ${session.currentTopic}, difficulty: ${session.currentDifficulty}`);
      }
      
      // Try a different question from the same topic and difficulty
      nextQuestion = await Question.findOne({
        topic: session.currentTopic,
        difficulty: session.currentDifficulty,
        _id: { $nin: answeredIds }
      });
    }
    
    // If no question found, try with any difficulty for the same topic
    if (!nextQuestion) {
      console.log(`No question found with specific difficulty. Trying any difficulty for topic: ${session.currentTopic}`);
      nextQuestion = await Question.findOne({
        topic: session.currentTopic,
        _id: { $nin: answeredIds }
      });
    }
    
    // If still no question, try case-insensitive search
    if (!nextQuestion) {
      console.log(`No question found with exact topic. Trying case-insensitive search for: ${session.currentTopic}`);
      nextQuestion = await Question.findOne({
        topic: { $regex: new RegExp(session.currentTopic, 'i') },
        _id: { $nin: answeredIds }
      });
    }
    
    // If still no question, move to next topic or get any available question
    if (!nextQuestion) {
      console.log('No question found for current topic. Getting any available question.');
      
      // Try to get any question that hasn't been answered
      nextQuestion = await Question.findOne({
        _id: { $nin: answeredIds }
      });
      
      // If found, update session topic to match the question
      if (nextQuestion) {
        session.currentTopic = nextQuestion.topic;
        session.currentDifficulty = nextQuestion.difficulty;
        console.log(`Switched to available question topic: ${session.currentTopic}`);
      }
    }
    
    // Last resort: if all questions have been answered, allow repeating a question
    if (!nextQuestion) {
      console.log('All questions have been answered. Allowing a repeat question.');
      nextQuestion = await Question.findOne({});
      if (nextQuestion) {
        session.currentTopic = nextQuestion.topic;
        session.currentDifficulty = nextQuestion.difficulty;
      }
    }
    
    await session.save();
    
    if (!nextQuestion) {
      return res.status(404).json({ 
        message: 'No questions available. Please add more questions to the database.',
        isCorrect,
        session
      });
    }
    
    res.status(200).json({
      isCorrect,
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