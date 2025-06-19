// src/app/models/interview.model.ts
export interface Interview {
  _id?: string;
  title: string;
  description?: string;
  interviewType: string;
  candidateName: string;
  candidateEmail: string;
  scheduledDate: Date;
  duration: number;
  difficultyLevel: number;
  topics: string[];
  status?: 'scheduled' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InterviewFormData {
  title: string;
  description?: string;
  interviewType: string;
  candidateName: string;
  candidateEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  difficultyLevel: number;
  topics: string[];
}