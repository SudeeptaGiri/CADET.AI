// src/app/components/interview-access/interview-access.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-interview-access',
  templateUrl: './interview-access.component.html',
  styleUrls: ['./interview-access.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class InterviewAccessComponent {
  accessCode: string = '';
  password: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) { }

  accessInterview(): void {
    if (!this.accessCode || !this.password) {
      this.toast.error('Please provide both access code and password');
      return;
    }
    
    this.loading = true;
    this.authService.accessInterview(this.accessCode, this.password)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.toast.success('Access granted. Redirecting to interview...');
          
          // Store interview data in localStorage if available
          if (response && response.data && response.data.interview) {
            localStorage.setItem('interviewId', response.data.interview._id);
            
            // Navigate to interview-room with the interview ID
            this.router.navigate(['/interview-room', response.data.interview._id]);
          } else {
            // If no interview data, just navigate to interview room
            // The component will try to use the stored token to fetch interview data
            this.router.navigate(['/interview-room']);
          }
        },
        error: (error) => {
          this.loading = false;
          this.toast.error(error.error?.message || 'Failed to access interview');
        }
      });
  }
}