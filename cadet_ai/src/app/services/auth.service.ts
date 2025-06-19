// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  // Login admin
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/login`, { email, password })
      .pipe(
        tap(res => {
          if (res && res.token) {
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            this.currentUserSubject.next(res.data.user);
          }
        })
      );
  }

  // Register admin

// Access interview as candidate
accessInterview(accessCode: string, password: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/interview-access`, { accessCode, password })
    .pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          
          // Store user data
          if (res.data && res.data.user) {
            localStorage.setItem('user', JSON.stringify(res.data.user));
            this.currentUserSubject.next(res.data.user);
          }
          
          // Store interview ID
          if (res.data && res.data.interviewId) {
            localStorage.setItem('interviewId', res.data.interviewId);
            console.log('Interview ID stored:', res.data.interviewId);
          } else if (res.data && res.data.interview && res.data.interview._id) {
            localStorage.setItem('interviewId', res.data.interview._id);
            console.log('Interview ID stored from interview object:', res.data.interview._id);
          }
        }
      })
    );
}
  // Logout
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // Get current user
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  }

   getToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}