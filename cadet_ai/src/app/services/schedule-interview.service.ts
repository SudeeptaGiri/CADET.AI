// src/app/services/interview.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Interview, InterviewFormData } from '../models/interview.model';
// import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScheduleInterviewService {
  // private apiUrl = `${environment.apiUrl}/interviews`;
  private apiUrl = 'https://api.example.com/interviews'; // Replace with your actual API URL

  constructor(private http: HttpClient) { }

  /**
   * Create a new interview
   * @param formData The interview form data
   * @returns Observable of the created interview
   */
  createInterview(formData: InterviewFormData): Observable<Interview> {
    // Combine date and time into a single Date object
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    
    // Convert difficulty level number to string
    const difficultyMapping = {
      1: 'beginner',
      2: 'intermediate',
      3: 'advanced'
    };
    
    const difficulty = difficultyMapping[formData.difficultyLevel as keyof typeof difficultyMapping];
    
    // Prepare data for API
    const interviewData = {
      title: formData.title,
      description: formData.description,
      interviewType: formData.interviewType,
      candidateName: formData.candidateName,
      candidateEmail: formData.candidateEmail,
      scheduledDate: scheduledDateTime.toISOString(),
      duration: formData.duration,
      difficulty: difficulty,
      topics: formData.topics
    };
    console.log('Interview Data:', interviewData);
    return this.http.post<Interview>(this.apiUrl, interviewData);
  }

  /**
   * Get all interviews with optional filters
   * @param filters Optional filters for status, date range, etc.
   * @returns Observable of interviews array
   */
  getInterviews(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Observable<Interview[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.startDate) {
        params = params.set('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params = params.set('endDate', filters.endDate);
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }
    
    return this.http.get<Interview[]>(this.apiUrl, { params })
      .pipe(
        map(interviews => interviews.map(interview => ({
          ...interview,
          scheduledDate: new Date(interview.scheduledDate)
        })))
      );
  }

  /**
   * Get a specific interview by ID
   * @param id The interview ID
   * @returns Observable of the interview
   */
  getInterview(id: string): Observable<Interview> {
    return this.http.get<Interview>(`${this.apiUrl}/${id}`)
      .pipe(
        map(interview => ({
          ...interview,
          scheduledDate: new Date(interview.scheduledDate)
        }))
      );
  }

  /**
   * Update an existing interview
   * @param id The interview ID
   * @param updateData The data to update
   * @returns Observable of the updated interview
   */
  updateInterview(id: string, updateData: Partial<Interview>): Observable<Interview> {
    return this.http.put<Interview>(`${this.apiUrl}/${id}`, updateData);
  }

  /**
   * Delete an interview
   * @param id The interview ID
   * @returns Observable of the deletion result
   */
  deleteInterview(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cancel an interview
   * @param id The interview ID
   * @returns Observable of the updated interview
   */
  cancelInterview(id: string): Observable<Interview> {
    return this.http.put<Interview>(`${this.apiUrl}/${id}/cancel`, {});
  }

  /**
   * Get all available topics for interviews
   * @returns Observable of topics array
   */
  getAvailableTopics(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/topics`);
  }

  /**
   * Get all available interview types
   * @returns Observable of interview types array
   */
  getInterviewTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`);
  }
}