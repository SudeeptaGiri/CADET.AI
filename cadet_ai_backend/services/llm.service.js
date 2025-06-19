const { Configuration, OpenAIApi } = require('openai');
const logger = require('../utils/logger');

class LLMService {
  constructor(apiKey) {
    const configuration = new Configuration({
      apiKey: apiKey,
    });
    this.openai = new OpenAIApi(configuration);
    this.maxRetries = 3;
  }
  
  async getEvaluation(prompt) {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      try {
        const response = await this.openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are an expert technical interviewer who evaluates answers accurately." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });
        
        const content = response.data.choices[0].message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        return JSON.parse(jsonMatch[0]);
        
      } catch (error) {
        attempts++;
        logger.error(`OpenAI API error (attempt ${attempts}): ${error.message}`);
        
        if (attempts >= this.maxRetries) {
          logger.error('Max retries reached for OpenAI API');
          return this.getFallbackEvaluation();
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }
    
    return this.getFallbackEvaluation();
  }
  
  async getImprovement(prompt) {
    try {
      const response = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful career coach providing specific, actionable advice." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const content = response.data.choices[0].message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse bullet points into array
      const suggestions = content
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.replace(/^[•-]\s*/, '').trim());
      
      return { suggestions: suggestions.length > 0 ? suggestions : this.getFallbackSuggestions() };
      
    } catch (error) {
      logger.error(`OpenAI API error for improvement suggestions: ${error.message}`);
      return { suggestions: this.getFallbackSuggestions() };
    }
  }
  
  getFallbackEvaluation() {
    return {
      score: 5,
      correctness: 5,
      relevance: 5,
      depth: 5,
      feedback: "Unable to evaluate answer due to technical issues. Please try again later.",
      strengths: ["N/A"],
      weaknesses: ["N/A"],
      keywordsCovered: [],
      keywordsMissed: []
    };
  }
  
  getFallbackSuggestions() {
    return [
      "Review core concepts in your weaker topics.",
      "Practice explaining technical concepts clearly and concisely.",
      "Time yourself when answering practice questions to improve speed.",
      "Focus on understanding fundamentals before advanced topics."
    ];
  }
}

module.exports = LLMService;