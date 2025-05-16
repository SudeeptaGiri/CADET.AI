import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Interview {
  _id: string;
  title: string;
  description: string;
  interviewType: string;
  candidateName: string;
  candidateEmail: string;
  scheduledDate: Date;
  duration: number;
  difficulty: string;
  topics: string[];
  status: string;
  createdBy: string;
  feedback: {
    strengths: string[];
    weaknesses: string[];
  };
  accessCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getInterviewById(id: string): Observable<Interview> {
    return this.http.get<Interview>(
      `${this.apiUrl}/interviews/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }
  
  getCurrentInterviewId(): string | null {
    return localStorage.getItem('interviewId');
  }
}