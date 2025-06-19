import { Component, OnInit, OnDestroy } from '@angular/core';
import { Question } from '../../models/question.model';
import { SessionService } from '../../services/session.service';
import { QuestionService } from '../../services/question.service';
import { VoiceService } from '../../services/voice.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-answer-input',
  templateUrl: './answer-input.component.html',
  styleUrls: ['./answer-input.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AnswerInputComponent implements OnInit, OnDestroy {
  question: Question | null = null;
  isListening = false;
  transcript = '';
  codeAnswer = '';
  isSubmitting = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' | '' = '';
  
  private subscriptions: Subscription[] = [];
  private originalCode = '';

  constructor(
    private sessionService: SessionService,
    private questionService: QuestionService,
    private voiceService: VoiceService
  ) { }

  ngOnInit(): void {
    // Log the initial state
    console.log('AnswerInputComponent initialized');
    
    // Subscribe to current question changes
    this.subscriptions.push(
      this.sessionService.currentQuestion$.subscribe(question => {
        console.log('Current question:', question);
        
        // Set question and reset inputs
        this.question = question;
        
        // If question is null, try to get it directly from the service
        if (!this.question) {
          const currentQuestion = this.sessionService.getCurrentQuestion();
          console.log('Trying to get question directly:', currentQuestion);
          if (currentQuestion) {
            this.question = currentQuestion;
          }
        }
        
        // Apply default category if missing
        if (this.question && !this.question.category) {
          console.log('Question missing category, defaulting to Theoretical');
          this.question = {
            ...this.question,
            category: 'Theoretical'
          };
        }
        
        this.resetInputs();
        
        // Set default code template if provided with the question
        // if (this.question && this.question.category === 'Coding' && this.question.codeTemplate) {
        //   this.codeAnswer = this.question.codeTemplate;
        //   this.originalCode = this.question.codeTemplate;
        // }
      }),
      
      this.voiceService.transcript$.subscribe(text => {
        this.transcript = text;
      }),
      
      this.voiceService.isListening$.subscribe(isListening => {
        this.isListening = isListening;
      })
    );
    
    // If we don't have a question yet, try to get it from the session service
    if (!this.question) {
      const currentQuestion = this.sessionService.getCurrentQuestion();
      console.log('Initial question check:', currentQuestion);
      if (currentQuestion) {
        this.question = currentQuestion;
        
        // Apply default category if missing
        if (!this.question.category) {
          this.question = {
            ...this.question,
            category: 'Theoretical'
          };
        }
      } else {
        console.log('No current question available');
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.voiceService.stopListening();
  }

  toggleListening(): void {
    if (this.isListening) {
      this.voiceService.stopListening();
    } else {
      this.voiceService.startListening();
    }
  }

  updateTranscript(event: any): void {
    this.transcript = event.target.value;
    this.voiceService.updateTranscript(this.transcript);
  }

  calculateRows(): number {
    // Dynamically calculate rows based on content length
    const minRows = 6;
    const maxRows = 12;
    
    if (!this.transcript) return minRows;
    
    const lineCount = (this.transcript.match(/\n/g) || []).length + 1;
    const estimatedRows = Math.ceil(this.transcript.length / 80) + lineCount;
    
    return Math.min(Math.max(estimatedRows, minRows), maxRows);
  }

  formatCode(): void {
    if (!this.codeAnswer) return;
    
    try {
      // This is a simple placeholder for code formatting
      // In a real app, you'd use a proper formatter like prettier
      // This just adds some basic indentation to demonstrate the concept
      
      let formatted = this.codeAnswer
        .replace(/\s*\{\s*/g, ' {\n  ')
        .replace(/\s*\}\s*/g, '\n}\n')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\n\s*\n/g, '\n\n');
      
      this.codeAnswer = formatted.trim();
      
      this.showFeedback('Code formatted', 'success');
    } catch (error) {
      this.showFeedback('Could not format code', 'error');
    }
  }

  resetCode(): void {
    if (this.originalCode) {
      this.codeAnswer = this.originalCode;
    } else {
      this.codeAnswer = '';
    }
    this.showFeedback('Code reset to original template', 'success');
  }

  isAnswerEmpty(): boolean {
    if (!this.question) return true;
    
    if (this.question.category === 'Theoretical') {
      return !this.transcript.trim();
    } else if (this.question.category === 'Coding') {
      return !this.codeAnswer.trim();
    }
    
    // Default case
    return !this.transcript.trim();
  }

  submitAnswer(): void {
    if (!this.question) {
      this.showFeedback('No question available to answer', 'error');
      return;
    }
    
    const session = this.sessionService.getCurrentSession();
    if (!session || !session._id) {
      this.showFeedback('No active session found', 'error');
      return;
    }
    
    if (this.isAnswerEmpty()) {
      this.showFeedback('Please provide an answer before submitting', 'error');
      return;
    }
    
    this.isSubmitting = true;
    this.clearFeedback();
    
    const sessionId = session._id;
    const answer = this.question.category === 'Coding' ? this.codeAnswer : this.transcript;
    
    // For coding questions, we would need to evaluate the code
    // Here we're just assuming it's correct for simplicity
    const isCorrect = this.question.category === 'Coding' ? true : undefined;
    
    console.log('Submitting answer:', {
      questionId: this.question._id,
      sessionId,
      answerLength: answer.length,
      category: this.question.category
    });
    
    this.questionService.submitAnswer({
      questionId: this.question._id,
      answer,
      sessionId,
      isCorrect
    }).subscribe({
      next: (response) => {
        console.log('Answer submitted successfully:', response);
        this.isSubmitting = false;
        this.showFeedback('Answer submitted successfully', 'success');
        
        // Update session and question
        if (response.session) {
          this.sessionService.setCurrentSession(response.session);
        }
        
        if (response.nextQuestion) {
          this.sessionService.setCurrentQuestion(response.nextQuestion);
        } else {
          // No more questions, interview might be complete
          this.showFeedback('All questions completed!', 'success');
        }
        
        this.resetInputs();
      },
      error: (error) => {
        console.error('Error submitting answer', error);
        this.isSubmitting = false;
        this.showFeedback(error.error?.message || 'Failed to submit answer. Please try again.', 'error');
      }
    });
  }

  skipQuestion(): void {
    if (!this.question) {
      this.showFeedback('No question available to skip', 'error');
      return;
    }
    
    const session = this.sessionService.getCurrentSession();
    if (!session || !session._id) {
      this.showFeedback('No active session found', 'error');
      return;
    }
    
    this.isSubmitting = true;
    this.clearFeedback();
    
    const sessionId = session._id;
    
    console.log('Skipping question:', {
      questionId: this.question._id,
      sessionId
    });
    
    this.questionService.submitAnswer({
      questionId: this.question._id,
      answer: "I don't know",
      sessionId,
      isCorrect: false
    }).subscribe({
      next: (response) => {
        console.log('Question skipped successfully:', response);
        this.isSubmitting = false;
        
        if (response.session) {
          this.sessionService.setCurrentSession(response.session);
        }
        
        if (response.nextQuestion) {
          this.sessionService.setCurrentQuestion(response.nextQuestion);
        } else {
          // No more questions, interview might be complete
          this.showFeedback('All questions completed!', 'success');
        }
        
        this.resetInputs();
      },
      error: (error) => {
        console.error('Error skipping question', error);
        this.isSubmitting = false;
        this.showFeedback(error.error?.message || 'Failed to skip question. Please try again.', 'error');
      }
    });
  }

  private resetInputs(): void {
    this.transcript = '';
    this.codeAnswer = '';
    this.originalCode = '';
    this.voiceService.stopListening();
    this.clearFeedback();
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    
    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (this.feedbackMessage === message) {
          this.clearFeedback();
        }
      }, 5000);
    }
  }

  private clearFeedback(): void {
    this.feedbackMessage = '';
    this.feedbackType = '';
  }
}