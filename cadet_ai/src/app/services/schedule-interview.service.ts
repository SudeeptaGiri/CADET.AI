// src/app/services/interview.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScheduleInterviewService {
  private apiUrl = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) {}

  // Get HTTP headers with auth token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Create a new interview
  createInterview(interviewData: any): Observable<any> {
    console.log('Interview data=', interviewData);
    return this.http.post(this.apiUrl, interviewData, {
      headers: this.getHeaders(),
    });
  }

  // Get all interviews
  getAllInterviews(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.getHeaders() });
  }

  // Get interview by ID
  getInterview(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  //Get current user's interview
  getMyInterview(): Observable<any> {
    // Get the token from localStorage or wherever you store it
    const token = localStorage.getItem('token');

    // Create headers with the Authorization bearer token
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    // Make the request with the headers
    return this.http.get(`${this.apiUrl}/my-interview`, { headers });
  }
  // Update interview
  updateInterview(id: string, interviewData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, interviewData, {
      headers: this.getHeaders(),
    });
  }

  // Delete interview
  deleteInterview(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // Cancel interview
  cancelInterview(id: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Get interview credentials
  getInterviewCredentials(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/credentials`, {
      headers: this.getHeaders(),
    });
  }

  // Get available topics
  getAvailableTopics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/topics`, {
      headers: this.getHeaders(),
    });
  }

  // Get interview types
  getInterviewTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/types`, {
      headers: this.getHeaders(),
    });
  }

  getInterviewByAccessCode(code: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/interviews/access/${code}`);
  }
}
