export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface Question {
  _id: string;
  questionText: string;
  topic: string;
  category: 'Theoretical' | 'Coding';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  keywords: string[];
  followUps: string[] | Question[];
  testCases?: TestCase[];
}