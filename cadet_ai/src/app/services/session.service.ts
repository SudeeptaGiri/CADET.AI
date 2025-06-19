import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Session } from '../models/session.model';
import { Question } from '../models/question.model';
import { AuthService } from './auth.service';
import { InterviewService, Interview } from './interview.service';
import { tap, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private apiUrl = 'http://localhost:5000/api/sessions';
  private questionsApiUrl = 'http://localhost:5000/api/questions';
  
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
    // Load interview data and active session if available
    this.loadSavedData();
  }

  /**
   * Load saved interview and session data from localStorage
   */
  private loadSavedData(): void {
    // First load interview data
    this.loadInterviewData();
    
    // Then try to load active session
    const activeSessionId = localStorage.getItem('activeSessionId');
    if (activeSessionId) {
      this.getSessionById(activeSessionId).subscribe({
        next: (session) => {
          console.log('Loaded active session:', session);
          this.setCurrentSession(session);
          
          // Load the current question for this session
          this.loadCurrentQuestionForSession(session);
        },
        error: (error) => {
          console.error('Error loading active session', error);
          localStorage.removeItem('activeSessionId');
        }
      });
    }
  }

  private loadInterviewData(): void {
    const interviewId = this.interviewService.getCurrentInterviewId();
    if (interviewId) {
      this.interviewService.getInterviewById(interviewId).subscribe({
        next: (interview) => {
          console.log('Loaded interview data:', interview);
          this.setCurrentInterview(interview);
        },
        error: (error) => {
          console.error('Error loading interview data', error);
        }
      });
    }
  }

  /**
   * Load the current question for a session
   */
  private loadCurrentQuestionForSession(session: Session): void {
    // Check if session has a current question ID
    if (session.currentQuestionId) {
      this.getQuestionById(session.currentQuestionId).subscribe({
        next: (question) => {
          console.log('Loaded current question:', question);
          this.setCurrentQuestion(question);
        },
        error: (error) => {
          console.error('Error loading current question', error);
          this.fetchNextQuestion(session);
        }
      });
    } else if (session.answeredQuestions && session.answeredQuestions.length > 0) {
      // If no current question but there are answered questions, get the next one
      this.fetchNextQuestion(session);
    } else {
      // If no questions at all, fetch the first question for the session
      this.fetchFirstQuestion(session);
    }
  }

  /**
   * Get a question by ID
   */
  getQuestionById(questionId: string): Observable<Question> {
    return this.http.get<Question>(
      `${this.questionsApiUrl}/${questionId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /**
   * Fetch the first question for a new session
   */
  private fetchFirstQuestion(session: Session): void {
    // This would typically call your API to get the first question based on session parameters
    this.http.get<Question>(
      `${this.questionsApiUrl}/first?sessionId=${session._id}`,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe({
      next: (question) => {
        console.log('Fetched first question:', question);
        this.setCurrentQuestion(question);
        
        // Update session with current question ID
        this.updateSession(session._id, { currentQuestionId: question._id }).subscribe();
      },
      error: (error) => {
        console.error('Error fetching first question', error);
      }
    });
  }

  /**
   * Fetch the next question after answering
   */
  private fetchNextQuestion(session: Session): void {
    // This would typically call your API to get the next question based on session state
    this.http.get<Question>(
      `${this.questionsApiUrl}/next?sessionId=${session._id}`,
      { headers: this.authService.getAuthHeaders() }
    ).subscribe({
      next: (question) => {
        console.log('Fetched next question:', question);
        this.setCurrentQuestion(question);
        
        // Update session with current question ID
        this.updateSession(session._id, { currentQuestionId: question._id }).subscribe();
      },
      error: (error) => {
        console.error('Error fetching next question', error);
      }
    });
  }

  createSession(userId: string, interviewId: string, initialTopic?: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}`, 
      { userId, interviewId, initialTopic },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.session) {
          console.log('Created new session:', response.session);
          this.setCurrentSession(response.session);
          
          // Save active session ID to localStorage
          localStorage.setItem('activeSessionId', response.session._id);
          
          // If response includes first question, set it
          if (response.firstQuestion) {
            console.log('Setting first question from response:', response.firstQuestion);
            this.setCurrentQuestion(response.firstQuestion);
            
            // Update session with current question ID if not already set
            if (!response.session.currentQuestionId) {
              this.updateSession(response.session._id, { 
                currentQuestionId: response.firstQuestion._id 
              }).subscribe();
            }
          }
        }
      })
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
          const mergedSession = {
            ...currentSession,
            ...updatedSession
          };
          console.log('Updated current session:', mergedSession);
          this.currentSessionSubject.next(mergedSession);
        }
      })
    );
  }
  
  /**
   * Submit an answer to the current question
   */
  submitAnswer(sessionId: string, questionId: string, answer: string, isCorrect?: boolean): Observable<any> {
    return this.http.post<any>(
      `${this.questionsApiUrl}/submit-answer`,
      { sessionId, questionId, answer, isCorrect },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.session) {
          console.log('Updated session after answer:', response.session);
          this.setCurrentSession(response.session);
        }
        
        if (response.nextQuestion) {
          console.log('Setting next question after answer:', response.nextQuestion);
          this.setCurrentQuestion(response.nextQuestion);
          
          // Update session with current question ID
          if (response.session && response.nextQuestion._id) {
            this.updateSession(response.session._id, { 
              currentQuestionId: response.nextQuestion._id 
            }).subscribe();
          }
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
          console.log('Completed session:', completedSession);
          this.currentSessionSubject.next({
            ...currentSession,
            ...completedSession,
            status: 'completed'
          });
        }
        
        // Remove active session from localStorage
        localStorage.removeItem('activeSessionId');
      })
    );
  }
  
  /**
   * Clear the current session data
   */
  clearCurrentSession(): void {
    this.currentSessionSubject.next(null);
    localStorage.removeItem('activeSessionId');
  }
  
  /**
   * Clear the current question data
   */
  clearCurrentQuestion(): void {
    this.currentQuestionSubject.next(null);
  }
  
  setCurrentSession(session: Session): void {
    console.log('Setting current session:', session);
    this.currentSessionSubject.next(session);
  }
  
  setCurrentQuestion(question: Question): void {
    console.log('Setting current question:', question);
    this.currentQuestionSubject.next(question);
  }
  
  setCurrentInterview(interview: Interview): void {
    console.log('Setting current interview:', interview);
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