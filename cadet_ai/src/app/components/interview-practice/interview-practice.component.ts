import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { InterviewService } from '../../services/interview.service';
import { AnswerInputComponent } from '../answer-input/answer-input.component';
import { QuestionViewComponent } from '../question-view/question-view.component';
import { FollowUpComponent } from '../follow-up/follow-up.component';
import { CommonModule } from '@angular/common';
import { SessionSummaryComponent } from '../session-summary/session-summary.component';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-interview-session',
  templateUrl: './interview-practice.component.html',
  styleUrls: ['./interview-practice.component.css'],
  standalone: true,
  imports: [CommonModule, AnswerInputComponent, QuestionViewComponent, FollowUpComponent]
})
export class InterviewSessionComponent implements OnInit, OnDestroy {
  isLoading = true;
  interviewTitle = 'Technical Interview';
  currentTopic: string | null = null;
  currentYear = new Date().getFullYear();
  isFullscreen = false;
  isMuted = false;
  showEndSessionModal = false;
  showTimeUpModal = false;
  showTimeWarning = false;
  
  // Timer related properties
  timeRemaining = 3600; // Default 60 minutes in seconds
  totalDuration = 3600; // Default total duration
  timerInterval: any;
  
  // Question navigation
  currentQuestionIndex = 0;
  totalQuestions = 1;
  isLastQuestion = false;
  progressPercentage = 0;
  
  private subscriptions: Subscription[] = [];
  private audioContext: AudioContext | null = null;
  private timeWarningSound: AudioBufferSourceNode | null = null;
  private timeUpSound: AudioBufferSourceNode | null = null;
  
  constructor(
    private sessionService: SessionService,
    private interviewService: InterviewService,
    private router: Router
  ) { }
  
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Alt + S: Submit Answer
    if (event.altKey && event.key === 's') {
      document.querySelector('.btn-submit')?.dispatchEvent(new Event('click'));
    }
    
    // Alt + N: Skip Question
    if (event.altKey && event.key === 'n') {
      this.nextQuestion();
    }
    
    // Alt + R: Toggle Recording
    if (event.altKey && event.key === 'r') {
      document.querySelector('.btn-start, .btn-stop')?.dispatchEvent(new Event('click'));
    }
    
    // F11: Toggle Fullscreen (handled by browser, we just update our state)
    if (event.key === 'F11') {
      setTimeout(() => {
        this.isFullscreen = !!document.fullscreenElement;
      }, 100);
    }
  }
  
  ngOnInit(): void {
    const interviewId = this.interviewService.getCurrentInterviewId();
    
    if (!interviewId) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Initialize audio context for notifications
    this.initAudioContext();
    
    // Check if we already have interview data
    if (this.sessionService.getCurrentInterview() && this.sessionService.getCurrentQuestion()) {
      this.isLoading = false;
      this.updateInterviewInfo();
      this.startTimer();
    } else {
      this.loadInterviewData();
    }
    
    // Subscribe to interview changes
    this.subscriptions.push(
      this.sessionService.currentInterview$.subscribe(interview => {
        if (interview) {
          this.updateInterviewInfo();
        }
      })
    );
    
    // Subscribe to question changes to update navigation
    this.subscriptions.push(
      this.sessionService.currentQuestion$.subscribe(question => {
        if (question) {
          this.updateQuestionNavigation();
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopTimer();
  }
  
  private updateInterviewInfo(): void {
    const interview = this.sessionService.getCurrentInterview();
    if (interview) {
      this.interviewTitle = interview.title || 'Technical Interview';
      
      // Set interview duration based on interview settings
      if (interview.duration) {
        // Convert minutes to seconds
        this.totalDuration = interview.duration * 60;
        
        // Check if we have a stored time remaining, otherwise use the full duration
        const storedTimeRemaining = localStorage.getItem('interviewTimeRemaining');
        if (storedTimeRemaining) {
          this.timeRemaining = parseInt(storedTimeRemaining, 10);
        } else {
          this.timeRemaining = this.totalDuration;
        }
      }
      
      // Set current topic
      if (interview.topics && interview.topics.length > 0) {
        this.currentTopic = interview.topics[0];
      }
      
      // Set total questions if available
      // if (interview.questionCount) {
      //   this.totalQuestions = interview.questionCount;
      // }
    }
  }
  
  private updateQuestionNavigation(): void {
    const session = this.sessionService.getCurrentSession();
    if (session) {
      // Update current question index if available
      if (session.answeredQuestions) {
        this.currentQuestionIndex = session.answeredQuestions.length;
      }
      
      // Check if this is the last question
      this.isLastQuestion = this.currentQuestionIndex >= this.totalQuestions - 1;
      
      // Update progress percentage
      this.progressPercentage = Math.min(100, (this.currentQuestionIndex / this.totalQuestions) * 100);
    }
  }
  
  private loadInterviewData(): void {
    const interviewId = this.interviewService.getCurrentInterviewId();
    
    if (!interviewId) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.interviewService.getInterviewById(interviewId).subscribe({
      next: (interview: any) => {
        let interviewData = interview.data.interview;
        this.sessionService.setCurrentInterview(interviewData);
        
        // Start a new session with the first topic from the interview
        const initialTopic = interviewData.topics && interviewData.topics.length > 0 ? interviewData.topics[0] : undefined;
        const userId = this.getUserId();
        
        if (!userId) {
          this.router.navigate(['/login']);
          return;
        }
        
        this.sessionService.createSession(userId, interviewId, initialTopic).subscribe({
          next: (response) => {
            if (response.session) {
              this.sessionService.setCurrentSession(response.session);
            }
            
            if (response.firstQuestion) {
              this.sessionService.setCurrentQuestion(response.firstQuestion);
            }
            
            this.isLoading = false;
            this.updateInterviewInfo();
            this.startTimer();
          },
          error: (error) => {
            console.error('Error creating session', error);
            this.isLoading = false;
            this.handleSessionError(error);
          }
        });
      },
      error: (error) => {
        console.error('Error loading interview data', error);
        this.router.navigate(['/login']);
      }
    });
  }
  
  private getUserId(): string | null {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return user?._id || null;
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      return null;
    }
  }
  
  private handleSessionError(error: any): void {
    this.router.navigate(['/login']);
  }
  
  // Timer functions
  private startTimer(): void {
    // Clear any existing timer
    this.stopTimer();
    
    // Start a new timer that ticks every second
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      
      // Save time remaining to localStorage for persistence
      localStorage.setItem('interviewTimeRemaining', this.timeRemaining.toString());
      
      // Show warning when 5 minutes remaining
      if (this.timeRemaining === 300) {
        this.showTimeWarning = true;
        this.playTimeWarningSound();
        
        // Hide warning after 10 seconds
        setTimeout(() => {
          this.showTimeWarning = false;
        }, 10000);
      }
      
      // End interview when time is up
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.stopTimer();
        this.showTimeUpModal = true;
        this.playTimeUpSound();
        this.completeInterview();
      }
    }, 1000);
  }
  
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
  
  formatTimeRemaining(): string {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Audio notification functions
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API is not supported in this browser');
    }
  }
  
  private playTimeWarningSound(): void {
    if (this.isMuted || !this.audioContext) return;
    
    try {
      // Create an oscillator for a warning beep
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.5);
      
      // Repeat the beep three times
      setTimeout(() => {
        if (!this.isMuted) this.playTimeWarningSound();
      }, 700);
    } catch (e) {
      console.error('Error playing warning sound', e);
    }
  }
  
  private playTimeUpSound(): void {
    if (this.isMuted || !this.audioContext) return;
    
    try {
      // Create a more urgent sound for time up
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime); // A3 note
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 1.5);
    } catch (e) {
      console.error('Error playing time up sound', e);
    }
  }
  
  // UI interaction methods
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setTimeout(() => {
      this.isFullscreen = !!document.fullscreenElement;
    }, 100);
  }
  
  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }
  
  nextQuestion(): void {
    // Logic to move to the next question
    // This would typically be handled by the answer-input component
    // But we provide a skip option here
    const session = this.sessionService.getCurrentSession();
    const question = this.sessionService.getCurrentQuestion();
    
    if (session && session._id && question && question._id) {
      // Record the skipped question
      this.sessionService.updateSession(session._id, {
        skippedQuestions: [...(session.skippedQuestions || []), question._id]
      }).subscribe({
        next: (updatedSession) => {
          // Move to next question logic would be here
          // For now, just update UI
          this.currentQuestionIndex++;
          this.updateQuestionNavigation();
        },
        error: (error) => {
          console.error('Error skipping question', error);
        }
      });
    }
  }
  
  endSession(): void {
    this.showEndSessionModal = true;
  }
  
  cancelEndSession(): void {
    this.showEndSessionModal = false;
  }
  
  confirmEndSession(): void {
    this.completeInterview();
    this.showEndSessionModal = false;
  }
  
  goToResults(): void {
    // Navigate to results page
    this.router.navigate(['/results']);
  }
  
  private completeInterview(): void {
    // Get current session
    const session = this.sessionService.getCurrentSession();
    
    if (session && session._id) {
      // Mark session as completed
      this.sessionService.completeSession(session._id).subscribe({
        next: () => {
          // Clear session data
          this.sessionService.clearCurrentSession();
          this.sessionService.clearCurrentQuestion();
          localStorage.removeItem('interviewTimeRemaining');
          
          // Navigate to results
          setTimeout(() => {
            this.router.navigate(['/results']);
          }, 1000);
        },
        error: (error) => {
          console.error('Error completing session', error);
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}