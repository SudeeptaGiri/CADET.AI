import { Component, OnInit } from '@angular/core';
import { Session } from '../../models/session.model';
import { SessionService } from '../../services/session.service';
import { QuestionService } from '../../services/question.service';
import { Interview } from '../../services/interview.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-summary',
  templateUrl: './session-summary.component.html',
  styleUrls: ['./session-summary.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class SessionSummaryComponent implements OnInit {
  session: Session | null = null;
  interview: Interview | null = null;
  
  constructor(
    private sessionService: SessionService,
    private questionService: QuestionService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.sessionService.currentSession$.subscribe(session => {
      this.session = session;
    });
    
    this.sessionService.currentInterview$.subscribe(interview => {
      this.interview = interview;
    });
  }
  
  changeTopic(): void {
    if (!this.session || !this.interview) return;
    
    // Get current topic index
    const currentTopicIndex = this.interview.topics.indexOf(this.session.currentTopic);
    
    // Get next topic (or wrap around to first topic)
    const nextTopicIndex = (currentTopicIndex + 1) % this.interview.topics.length;
    const nextTopic = this.interview.topics[nextTopicIndex];
    
    this.questionService.getNextTopic(this.session._id).subscribe({
      next: (response) => {
        if (response.session) {
          this.sessionService.setCurrentSession(response.session);
        }
        
        if (response.nextQuestion) {
          this.sessionService.setCurrentQuestion(response.nextQuestion);
        }
      },
      error: (error) => {
        console.error('Error changing topic', error);
      }
    });
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}