import { Component, OnInit, OnDestroy } from '@angular/core';
import { Question } from '../../models/question.model';
import { SessionService } from '../../services/session.service';
import { QuestionService } from '../../services/question.service';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-follow-up',
  templateUrl: './follow-up.component.html',
  styleUrls: ['./follow-up.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class FollowUpComponent implements OnInit, OnDestroy {
  currentQuestion: Question | null = null;
  followUpQuestions: Question[] = [];
  isLoading: boolean = false;
  loadError: string = '';
  expandedQuestions: { [key: string]: boolean } = {};
  
  private subscriptions: Subscription[] = [];
  
  constructor(
    private sessionService: SessionService,
    private questionService: QuestionService
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.sessionService.currentQuestion$.subscribe(question => {
        this.currentQuestion = question;
        if (question && Array.isArray(question.followUps) && question.followUps.length > 0) {
          this.loadFollowUps(question);
        } else {
          this.followUpQuestions = [];
          this.loadError = '';
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private loadFollowUps(question: Question): void {
    this.isLoading = true;
    this.loadError = '';
    this.expandedQuestions = {};
    
    if (typeof question.followUps[0] === 'string') {
      // If followUps are just IDs, fetch the actual questions
      const followUpIds = question.followUps as string[];
      
      // Create an array of observables for each question fetch
      const questionObservables = followUpIds.map(id => 
        this.questionService.getQuestionById(id).pipe(
          catchError(error => {
            console.error(`Error loading follow-up question ${id}:`, error);
            // Return a placeholder for failed questions
            return of(null);
          })
        )
      );
      
      // Use forkJoin to wait for all requests to complete
      this.subscriptions.push(
        forkJoin(questionObservables).subscribe({
          next: (questions) => {
            this.isLoading = false;
            // Filter out any null results from errors
            this.followUpQuestions = questions.filter(q => q !== null) as Question[];
            
            if (this.followUpQuestions.length === 0 && followUpIds.length > 0) {
              this.loadError = 'Could not load any follow-up questions. Please try again.';
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.loadError = 'Failed to load follow-up questions. Please try again.';
            console.error('Error in forkJoin:', error);
          }
        })
      );
    } else {
      // If followUps are already Question objects
      this.followUpQuestions = question.followUps as Question[];
      this.isLoading = false;
    }
  }
  
  selectFollowUp(question: Question): void {
    this.sessionService.setCurrentQuestion(question);
  }
  
  isSelected(question: Question): boolean {
    return this.currentQuestion?._id === question._id;
  }
  
  toggleExpand(questionId: string, event: MouseEvent): void {
    // Prevent the click from also triggering the parent's click event
    event.stopPropagation();
    
    this.expandedQuestions[questionId] = !this.expandedQuestions[questionId];
  }
  
  retryLoadFollowUps(): void {
    if (this.currentQuestion) {
      this.loadFollowUps(this.currentQuestion);
    }
  }
}