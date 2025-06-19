export interface Report {
  _id: string;
  interviewId: any; // Can be string or populated object
  candidateId: any; // Can be string or populated object
  overallRating: number;
  technicalAssessment: {
    implementationRating: number;
    theoreticalRating: number;
    topicAssessments: {
      topic: string;
      score: number;
      isStrength: boolean;
      comments: string;
    }[];
  };
  behavioralAnalysis: {
    confidence: number;
    sentiment: string;
    fillerWordFrequency: number;
    articulationClarity: number;
  };
  integrityVerification: {
    impersonationDetected: boolean;
    anomaliesDetected: string[];
    conductCompliance: boolean;
  };
  recommendations: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilters {
  interviewType?: string;
  candidateName?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: string;
  endDate?: string;
  topic?: string;
  isStrength?: boolean;
  sentiment?: string;
  page?: number;
  limit?: number;
  sort?: string;
}