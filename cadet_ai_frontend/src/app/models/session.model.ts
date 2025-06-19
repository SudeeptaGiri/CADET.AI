export interface AnsweredQuestion {
  questionId: string;
  correct: boolean;
  userAnswer: string;
  timestamp: Date;
}

export interface Session {
  _id: string;
  userId: string;
  interviewId: string;
  currentTopic: string;
  currentDifficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
  topicFailures: number;
  currentQuestionId?: string; // Added this field
  answeredQuestions: AnsweredQuestion[];
  skippedQuestions?: string[]; // Added this field
  status?: 'active' | 'completed' | 'abandoned'; // Added this field
  createdAt: Date;
}