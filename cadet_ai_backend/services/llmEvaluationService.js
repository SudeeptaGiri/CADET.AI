// llmEvaluationService.js
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function evaluateAnswer(question, answer) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert engineering interviewer evaluating candidate answers. 
          Provide a correctness score from 1-10 and brief feedback explaining why the answer 
          is correct or incorrect. Return your response in JSON format with fields: 
          "score" (number) and "feedback" (string).`
        },
        {
          role: "user",
          content: `Question: ${question}\nCandidate's Answer: ${answer}\n\nEvaluate this answer.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const evaluation = JSON.parse(response.choices[0].message.content);
    return {
      score: evaluation.score,
      feedback: evaluation.feedback
    };
  } catch (error) {
    console.error("Error evaluating answer:", error);
    throw new Error("Failed to evaluate answer");
  }
}

module.exports = { evaluateAnswer };