// src/app/components/interview-list/interview-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ScheduleInterviewService } from '../../services/schedule-interview.service';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast.service';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-interview-list',
  templateUrl: './interview-list.component.html',
  styleUrls: ['./interview-list.component.css'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('0.3s ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
})
export class InterviewListComponent implements OnInit {
  interviews: any[] = [];
  loading: boolean = false;
  selectedInterview: any = null;
  showCredentialsModal: boolean = false;
  accessCode: string = '';
  plainPassword: string = '';

  constructor(
    private interviewService: ScheduleInterviewService,
    private router: Router,
    private toastr: ToastService
  ) { }

  ngOnInit(): void {
    this.loadInterviews();
  }

  loadInterviews(): void {
    this.loading = true;
    this.interviewService.getAllInterviews().subscribe({
      next: (response) => {
        this.interviews = response.data.interviews;
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to load interviews');
        this.loading = false;
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getDurationString(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? 
        `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes` : 
        `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'scheduled': 
        return 'px-3 py-1 text-xs font-medium rounded-full bg-blue-900/70 text-blue-200 border border-blue-500/30';
      case 'completed': 
        return 'px-3 py-1 text-xs font-medium rounded-full bg-green-900/70 text-green-200 border border-green-500/30';
      case 'cancelled': 
        return 'px-3 py-1 text-xs font-medium rounded-full bg-red-900/70 text-red-200 border border-red-500/30';
      default: 
        return 'px-3 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 border border-gray-500/30';
    }
  }

  editInterview(id: string): void {
    this.router.navigate(['/interviews/edit', id]);
  }

  deleteInterview(id: string): void {
    if (confirm('Are you sure you want to delete this interview?')) {
      this.interviewService.deleteInterview(id).subscribe({
        next: () => {
          this.toastr.success('Interview deleted successfully');
          this.loadInterviews();
        },
        error: (error) => {
          this.toastr.error(error.error.message || 'Failed to delete interview');
        }
      });
    }
  }

  cancelInterview(id: string): void {
    if (confirm('Are you sure you want to cancel this interview?')) {
      this.interviewService.cancelInterview(id).subscribe({
        next: () => {
          this.toastr.success('Interview cancelled successfully');
          this.loadInterviews();
        },
        error: (error) => {
          this.toastr.error(error.error.message || 'Failed to cancel interview');
        }
      });
    }
  }

  showCredentials(interview: any): void {
    this.interviewService.getInterviewCredentials(interview.id).subscribe({
      next: (response) => {
        console.log('Interview credentials:', response);
        this.accessCode = response.data.accessCode;
        this.plainPassword = response.data.accessPassword;
      },
      error: (error) => {
        this.toastr.error(error.error.message || 'Failed to load interview credentials');
      }
    });
    this.selectedInterview = interview; 
    this.showCredentialsModal = true;
  }

  closeCredentialsModal(): void {
    this.showCredentialsModal = false;
    this.selectedInterview = null;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Copied to clipboard');
    });
  }
}