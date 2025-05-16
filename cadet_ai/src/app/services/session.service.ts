import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { Session } from '../models/session.model';
import { Question } from '../models/question.model';
import { AuthService } from './auth.service';
import { InterviewService, Interview } from './interview.service';
import { tap, catchError, retry, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = `${environment.apiUrl}/sessions`;
  
  private currentSessionSubject = new BehaviorSubject<Session | null>(null);
  private currentQuestionSubject = new BehaviorSubject<Question | null>(null);
  private currentInterviewSubject = new BehaviorSubject<Interview | null>(null);
  private sessionLoadingSubject = new BehaviorSubject<boolean>(false);
  private sessionErrorSubject = new BehaviorSubject<string | null>(null);
  
  // Public observables
  currentSession$ = this.currentSessionSubject.asObservable();
  currentQuestion$ = this.currentQuestionSubject.asObservable();
  currentInterview$ = this.currentInterviewSubject.asObservable();
  sessionLoading$ = this.sessionLoadingSubject.asObservable();
  sessionError$ = this.sessionErrorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private interviewService: InterviewService
  ) { 
    // Try to restore session state from localStorage on service initialization
    this.restoreSessionState();
    
    // Load interview data if available
    this.loadInterviewData();
  }

  /**
   * Attempts to load interview data if an interview ID is available
   */
  private loadInterviewData(): void {
    const interviewId = this.interviewService.getCurrentInterviewId();
    if (interviewId) {
      this.sessionLoadingSubject.next(true);
      this.interviewService.getInterviewById(interviewId).subscribe({
        next: (response: any) => {
          if (response && response.data && response.data.interview) {
            this.setCurrentInterview(response.data.interview);
          } else {
            console.error('Invalid interview data format', response);
            this.sessionErrorSubject.next('Invalid interview data format');
          }
          this.sessionLoadingSubject.next(false);
        },
        error: (error) => {
          console.error('Error loading interview data', error);
          this.sessionErrorSubject.next('Failed to load interview data');
          this.sessionLoadingSubject.next(false);
        }
      });
    }
  }

  /**
   * Creates a new session for the given user and interview
   */
  createSession(userId: string, interviewId: string, initialTopic?: string): Observable<any> {
    this.sessionLoadingSubject.next(true);
    this.sessionErrorSubject.next(null);
    
    return this.http.post<any>(
      `${this.apiUrl}`, 
      { userId, interviewId, initialTopic },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        this.sessionLoadingSubject.next(false);
        // Save session state to localStorage for persistence
        if (response.session) {
          this.saveSessionToLocalStorage(response.session);
        }
        if (response.firstQuestion) {
          this.saveQuestionToLocalStorage(response.firstQuestion);
        }
      }),
      catchError(this.handleError<any>('create session'))
    );
  }

  /**
   * Gets a session by ID
   */
  getSessionById(id: string): Observable<Session> {
    return this.http.get<Session>(
      `${this.apiUrl}/${id}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      retry(1),
      catchError(this.handleError<Session>('get session'))
    );
  }

  /**
   * Gets all sessions for a user
   */
  getUserSessions(userId: string): Observable<Session[]> {
    return this.http.get<Session[]>(
      `${this.apiUrl}/user/${userId}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      retry(1),
      catchError(this.handleError<Session[]>('get user sessions', []))
    );
  }
  
  /**
   * Gets all sessions for an interview
   */
  getInterviewSessions(interviewId: string): Observable<Session[]> {
    return this.http.get<Session[]>(
      `${this.apiUrl}/interview/${interviewId}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      retry(1),
      catchError(this.handleError<Session[]>('get interview sessions', []))
    );
  }
  
  /**
   * Updates an existing session
   */
  updateSession(sessionId: string, updateData: Partial<Session>): Observable<Session> {
    return this.http.patch<Session>(
      `${this.apiUrl}/${sessionId}`,
      updateData,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(updatedSession => {
        // If this is the current session, update it
        if (this.currentSessionSubject.value?._id === sessionId) {
          this.setCurrentSession(updatedSession);
        }
      }),
      catchError(this.handleError<Session>('update session'))
    );
  }
  
  /**
   * Completes a session
   */
  completeSession(sessionId: string): Observable<Session> {
    return this.http.patch<Session>(
      `${this.apiUrl}/${sessionId}/complete`,
      {},
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(completedSession => {
        // If this is the current session, update it
        if (this.currentSessionSubject.value?._id === sessionId) {
          this.setCurrentSession(completedSession);
          // Clear localStorage since session is complete
          this.clearSessionFromLocalStorage();
        }
      }),
      catchError(this.handleError<Session>('complete session'))
    );
  }
  
  /**
   * Gets session statistics
   */
  getSessionStats(sessionId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${sessionId}/stats`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError<any>('get session statistics', {}))
    );
  }
  
  /**
   * Sets the current session and saves it to localStorage
   */
  setCurrentSession(session: Session): void {
    this.currentSessionSubject.next(session);
    this.saveSessionToLocalStorage(session);
  }
  
  /**
   * Sets the current question and saves it to localStorage
   */
  setCurrentQuestion(question: Question): void {
    this.currentQuestionSubject.next(question);
    this.saveQuestionToLocalStorage(question);
  }
  
  /**
   * Sets the current interview and saves it to localStorage
   */
  setCurrentInterview(interview: Interview): void {
    this.currentInterviewSubject.next(interview);
    this.saveInterviewToLocalStorage(interview);
  }
  
  /**
   * Gets the current session
   */
  getCurrentSession(): Session | null {
    return this.currentSessionSubject.value;
  }
  
  /**
   * Gets the current question
   */
  getCurrentQuestion(): Question | null {
    return this.currentQuestionSubject.value;
  }
  
  /**
   * Gets the current interview
   */
  getCurrentInterview(): Interview | null {
    return this.currentInterviewSubject.value;
  }
  
  /**
   * Clears the current session
   */
  clearCurrentSession(): void {
    this.currentSessionSubject.next(null);
    this.clearSessionFromLocalStorage();
  }
  
  /**
   * Clears the current question
   */
  clearCurrentQuestion(): void {
    this.currentQuestionSubject.next(null);
    localStorage.removeItem('currentQuestion');
  }
  
  /**
   * Clears the current interview
   */
  clearCurrentInterview(): void {
    this.currentInterviewSubject.next(null);
    localStorage.removeItem('currentInterview');
  }
  
  /**
   * Clears all session data
   */
  clearAllSessionData(): void {
    this.clearCurrentSession();
    this.clearCurrentQuestion();
    this.clearCurrentInterview();
    this.sessionErrorSubject.next(null);
  }
  
  /**
   * Saves session to localStorage for persistence
   */
  private saveSessionToLocalStorage(session: Session): void {
    try {
      localStorage.setItem('currentSession', JSON.stringify(session));
    } catch (e) {
      console.error('Error saving session to localStorage', e);
    }
  }
  
  /**
   * Saves question to localStorage for persistence
   */
  private saveQuestionToLocalStorage(question: Question): void {
    try {
      localStorage.setItem('currentQuestion', JSON.stringify(question));
    } catch (e) {
      console.error('Error saving question to localStorage', e);
    }
  }
  
  /**
   * Saves interview to localStorage for persistence
   */
  private saveInterviewToLocalStorage(interview: Interview): void {
    try {
      localStorage.setItem('currentInterview', JSON.stringify(interview));
    } catch (e) {
      console.error('Error saving interview to localStorage', e);
    }
  }
  
  /**
   * Clears session from localStorage
   */
  private clearSessionFromLocalStorage(): void {
    localStorage.removeItem('currentSession');
  }
  
  /**
   * Restores session state from localStorage
   */
  private restoreSessionState(): void {
    try {
      // Restore session
      const sessionStr = localStorage.getItem('currentSession');
      if (sessionStr) {
        const session = JSON.parse(sessionStr) as Session;
        this.currentSessionSubject.next(session);
      }
      
      // Restore question
      const questionStr = localStorage.getItem('currentQuestion');
      if (questionStr) {
        const question = JSON.parse(questionStr) as Question;
        this.currentQuestionSubject.next(question);
      }
      
      // Restore interview
      const interviewStr = localStorage.getItem('currentInterview');
      if (interviewStr) {
        const interview = JSON.parse(interviewStr) as Interview;
        this.currentInterviewSubject.next(interview);
      }
    } catch (e) {
      console.error('Error restoring session state from localStorage', e);
      // Clear potentially corrupted data
      this.clearAllSessionData();
    }
  }
  
  /**
   * Generic error handler for HTTP requests with proper typing
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      // Let subscribers know about the error
      this.sessionLoadingSubject.next(false);
      
      let errorMessage = 'An error occurred. Please try again.';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else if (error.status) {
        // Server-side error
        errorMessage = `Error ${error.status}: ${error.error?.message || error.statusText}`;
      }
      
      this.sessionErrorSubject.next(errorMessage);
      
      // Return a safe result (if provided) or re-throw
      if (result !== undefined) {
        return of(result as T);
      } else {
        return throwError(() => new Error(errorMessage)) as Observable<T>;
      }
    };
  }
}