import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Session } from '../models/session.model';
import { Question } from '../models/question.model';
import { AuthService } from './auth.service';
import { InterviewService, Interview } from './interview.service';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:5000/api/sessions';
  
  private currentSessionSubject = new BehaviorSubject<Session | null>(null);
  private currentQuestionSubject = new BehaviorSubject<Question | null>(null);
  private currentInterviewSubject = new BehaviorSubject<Interview | null>(null);
  
  currentSession$ = this.currentSessionSubject.asObservable();
  currentQuestion$ = this.currentQuestionSubject.asObservable();
  currentInterview$ = this.currentInterviewSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private interviewService: InterviewService
  ) { 
    // Load interview data if available
    this.loadInterviewData();
  }

  private loadInterviewData(): void {
    const interviewId = this.interviewService.getCurrentInterviewId();
    if (interviewId) {
      this.interviewService.getInterviewById(interviewId).subscribe({
        next: (interview) => {
          this.setCurrentInterview(interview);
        },
        error: (error) => {
          console.error('Error loading interview data', error);
        }
      });
    }
  }

  createSession(userId: string, interviewId: string, initialTopic?: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}`, 
      { userId, interviewId, initialTopic },
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getSessionById(id: string): Observable<Session> {
    return this.http.get<Session>(
      `${this.apiUrl}/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getUserSessions(userId: string): Observable<Session[]> {
    return this.http.get<Session[]>(
      `${this.apiUrl}/user/${userId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }
  
  getInterviewSessions(interviewId: string): Observable<Session[]> {
    return this.http.get<Session[]>(
      `${this.apiUrl}/interview/${interviewId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }
  
  /**
   * Update a session with partial data
   * @param sessionId The ID of the session to update
   * @param updateData Partial session data to update
   * @returns Observable with the updated session
   */
  updateSession(sessionId: string, updateData: Partial<Session>): Observable<Session> {
    return this.http.patch<Session>(
      `${this.apiUrl}/${sessionId}`,
      updateData,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(updatedSession => {
        // Update the current session in the BehaviorSubject if it's the active one
        const currentSession = this.currentSessionSubject.value;
        if (currentSession && currentSession._id === sessionId) {
          this.currentSessionSubject.next({
            ...currentSession,
            ...updatedSession
          });
        }
      })
    );
  }
  
  /**
   * Mark a session as completed
   * @param sessionId The ID of the session to complete
   * @returns Observable with the completed session
   */
  completeSession(sessionId: string): Observable<Session> {
    return this.http.post<Session>(
      `${this.apiUrl}/${sessionId}/complete`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(completedSession => {
        // Update the current session in the BehaviorSubject if it's the active one
        const currentSession = this.currentSessionSubject.value;
        if (currentSession && currentSession._id === sessionId) {
          this.currentSessionSubject.next({
            ...currentSession,
            ...completedSession
          });
        }
      })
    );
  }
  
  /**
   * Clear the current session data
   */
  clearCurrentSession(): void {
    this.currentSessionSubject.next(null);
  }
  
  /**
   * Clear the current question data
   */
  clearCurrentQuestion(): void {
    this.currentQuestionSubject.next(null);
  }
  
  setCurrentSession(session: Session): void {
    this.currentSessionSubject.next(session);
  }
  
  setCurrentQuestion(question: Question): void {
    this.currentQuestionSubject.next(question);
  }
  
  setCurrentInterview(interview: Interview): void {
    this.currentInterviewSubject.next(interview);
  }
  
  getCurrentSession(): Session | null {
    return this.currentSessionSubject.value;
  }
  
  getCurrentQuestion(): Question | null {
    return this.currentQuestionSubject.value;
  }
  
  getCurrentInterview(): Interview | null {
    return this.currentInterviewSubject.value;
  }
}