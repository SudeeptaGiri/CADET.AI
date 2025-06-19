import { Component, OnInit } from '@angular/core';
import { Question, TestCase } from '../../models/question.model';
import { SessionService } from '../../services/session.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Resource {
  title?: string;
  url: string;
}

@Component({
  selector: 'app-question-view',
  templateUrl: './question-view.component.html',
  styleUrls: ['./question-view.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class QuestionViewComponent implements OnInit {
  question: Question | null = null;
  showAllTestCases: boolean = false;
  showHints: boolean = false;
  showCopyNotification: boolean = false;
  visibleTestCases: TestCase[] = [];
  
  constructor(
    private sessionService: SessionService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.sessionService.currentQuestion$.subscribe(question => {
      console.log('Current question:', question);
      this.question = question;
      this.showAllTestCases = false;
      this.showHints = false;
      
      if (question && question.testCases) {
        // Initially show only the first 2 test cases if there are more
        this.updateVisibleTestCases();
      }
    });
  }
  
  formatDescription(description: string): SafeHtml {
    // Convert markdown-like syntax to HTML
    // This is a simple implementation - in a real app, use a proper markdown library
    
    if (!description) return '';
    
    let formatted = description
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre class="bg-gray-900 p-3 rounded-lg my-3 font-mono text-sm text-blue-300 overflow-x-auto">$1</pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-900 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm">$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>');
    
    // Wrap lists in ul tags
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 my-3">$1</ul>');
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
  
  formatTestCaseValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    
    return String(value);
  }
  
  toggleTestCases(): void {
    this.showAllTestCases = !this.showAllTestCases;
    this.updateVisibleTestCases();
  }
  
  updateVisibleTestCases(): void {
    if (!this.question || !this.question.testCases) {
      this.visibleTestCases = [];
      return;
    }
    
    if (this.showAllTestCases || this.question.testCases.length <= 2) {
      this.visibleTestCases = this.question.testCases;
    } else {
      this.visibleTestCases = this.question.testCases.slice(0, 2);
    }
  }
  
  toggleHints(): void {
    this.showHints = !this.showHints;
  }
  
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showCopyNotification = true;
      setTimeout(() => {
        this.showCopyNotification = false;
      }, 3000);
    });
  }
  
  copyTestCase(testCase: TestCase): void {
    const textToCopy = `Input: ${JSON.stringify(testCase.input)}\nExpected Output: ${JSON.stringify(testCase.expectedOutput)}`;
    this.copyToClipboard(textToCopy);
  }
  
  startNewSession(): void {
    this.router.navigate(['/interviews/new']);
  }
}