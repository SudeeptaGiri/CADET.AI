const Question = require('../models/question.model');
const logger = require('../utils/logger');

class QuestionService {
  async getById(id) {
    try {
      return await Question.findById(id);
    } catch (error) {
      logger.error(`Error getting question by ID: ${error.message}`);
      throw error;
    }
  }
  
  async getByIds(ids) {
    try {
      return await Question.find({ _id: { $in: ids } });
    } catch (error) {
      logger.error(`Error getting questions by IDs: ${error.message}`);
      throw error;
    }
  }
  
  async findQuestion(query) {
    try {
      const filter = {};
      
      if (query.topic) {
        filter.topic = query.topic;
      }
      
      if (query.difficulty) {
        filter.difficulty = query.difficulty;
      }
      
      if (query.excludeIds && query.excludeIds.length > 0) {
        filter._id = { $nin: query.excludeIds };
      }
      
      // Find a random question matching the criteria
      const count = await Question.countDocuments(filter);
      
      if (count === 0) {
        // If no questions match the criteria, try without topic and difficulty filters
        const fallbackFilter = query.excludeIds && query.excludeIds.length > 0 
          ? { _id: { $nin: query.excludeIds } } 
          : {};
          
        const fallbackCount = await Question.countDocuments(fallbackFilter);
        
        if (fallbackCount === 0) {
          throw new Error('No available questions found');
        }
        
        const randomIndex = Math.floor(Math.random() * fallbackCount);
        return await Question.findOne(fallbackFilter).skip(randomIndex);
      }
      
      const randomIndex = Math.floor(Math.random() * count);
      return await Question.findOne(filter).skip(randomIndex);
    } catch (error) {
      logger.error(`Error finding question: ${error.message}`);
      throw error;
    }
  }
  
  async getByTopic(topic) {
    try {
      return await Question.find({ topic });
    } catch (error) {
      logger.error(`Error getting questions by topic: ${error.message}`);
      throw error;
    }
  }
  
  async getByDifficulty(difficulty) {
    try {
      return await Question.find({ difficulty });
    } catch (error) {
      logger.error(`Error getting questions by difficulty: ${error.message}`);
      throw error;
    }
  }
  
  async createQuestion(questionData) {
    try {
      const question = new Question(questionData);
      return await question.save();
    } catch (error) {
      logger.error(`Error creating question: ${error.message}`);
      throw error;
    }
  }
  
  async updateQuestion(id, questionData) {
    try {
      return await Question.findByIdAndUpdate(id, questionData, { new: true });
    } catch (error) {
      logger.error(`Error updating question: ${error.message}`);
      throw error;
    }
  }
  
  async deleteQuestion(id) {
    try {
      return await Question.findByIdAndDelete(id);
    } catch (error) {
      logger.error(`Error deleting question: ${error.message}`);
      throw error;
    }
  }
}

module.exports = QuestionService;