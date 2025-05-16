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
  answeredQuestions: AnsweredQuestion[];
  createdAt: Date;
  skippedQuestions?: string[];
}