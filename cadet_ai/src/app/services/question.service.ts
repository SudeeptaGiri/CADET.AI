import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { Question } from '../models/question.model';
import { AuthService } from './auth.service';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = 'http://localhost:5000/api/questions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getQuestions(filters?: { topic?: string, category?: string, difficulty?: string }): Observable<Question[]> {
    let queryParams = '';
    
    if (filters) {
      const params = [];
      if (filters.topic) params.push(`topic=${filters.topic}`);
      if (filters.category) params.push(`category=${filters.category}`);
      if (filters.difficulty) params.push(`difficulty=${filters.difficulty}`);
      
      if (params.length) {
        queryParams = '?' + params.join('&');
      }
    }
    
    return this.http.get<Question[]>(
      `${this.apiUrl}${queryParams}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getQuestionById(id: string): Observable<Question> {
    return this.http.get<Question>(
      `${this.apiUrl}/${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  submitAnswer(data: { questionId: string, answer: string, sessionId: string, isCorrect?: boolean }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/submit-answer`,
      data,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  getNextTopic(sessionId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/next-topic?sessionId=${sessionId}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }
  
  // Map interview difficulty to question difficulty
  mapDifficulty(interviewDifficulty: string): string {
    switch(interviewDifficulty.toLowerCase()) {
      case 'beginner':
        return 'Easy';
      case 'intermediate':
        return 'Medium';
      case 'advanced':
        return 'Hard';
      default:
        return 'Medium';
    }
  }
  
  // Get questions for specific interview topics
  getQuestionsByTopics(topics: string[], difficulty: string): Observable<Question[]> {
    // Map the interview difficulty to question difficulty
    const mappedDifficulty = this.mapDifficulty(difficulty);
    
    // Make parallel requests for each topic and combine results
    const requests = topics.map(topic => 
      this.getQuestions({ topic, difficulty: mappedDifficulty })
    );
    
    // If we have no topics, return empty array
    if (requests.length === 0) {
      return of([]);
    }
    
    // Combine all topic requests
    return forkJoin(requests).pipe(
      map(results => {
        // Flatten array of arrays
        return results.reduce((acc, val) => acc.concat(val), []);
      }),
      catchError(error => {
        console.error('Error fetching questions by topics', error);
        return of([]);
      })
    );
  }
}