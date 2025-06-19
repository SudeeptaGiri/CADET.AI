// code-editor.component.ts
import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as monaco from 'monaco-editor';
import { CodeExecutionService } from '../../services/code-execution.service';

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CodeEditorComponent implements OnInit, AfterViewInit {
  @Input() question: any;
  // @Input() onSubmitCode: (code: string, language: string) => void;
  
  @ViewChild('editorContainer') editorContainer!: ElementRef;
  
  editor: any;
  code = '';
  selectedLanguage = 'javascript';
  isRunning = false;
  isSubmitting = false;
  testResults: any[] = [];
  consoleOutput = '';
  showConsole = false;
  
  languageOptions = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'csharp', name: 'C#' },
    { id: 'cpp', name: 'C++' }
  ];

  constructor(private codeExecutionService: CodeExecutionService) {}

  ngOnInit(): void {
    // Set default language from question if available
    if (this.question?.programmingLanguage) {
      this.selectedLanguage = this.question.programmingLanguage.toLowerCase();
    }
    
    // Set initial code from template if available
    if (this.question?.codeTemplate) {
      this.code = this.question.codeTemplate;
    }
  }

  ngAfterViewInit(): void {
    this.initMonacoEditor();
  }

  initMonacoEditor(): void {
    // Create Monaco Editor instance
    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.code,
      language: this.selectedLanguage,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      tabSize: 2
    });

    // Update code on change
    this.editor.onDidChangeModelContent(() => {
      this.code = this.editor.getValue();
    });
  }

  changeLanguage(event: any): void {
    const newLanguage = event.target.value;
    this.selectedLanguage = newLanguage;
    
    // Update editor language
    monaco.editor.setModelLanguage(this.editor.getModel(), newLanguage);
    
    // Update code template based on language if available
    if (this.question?.codeTemplates && this.question.codeTemplates[newLanguage]) {
      this.editor.setValue(this.question.codeTemplates[newLanguage]);
    }
  }

  formatCode(): void {
    this.editor.getAction('editor.action.formatDocument').run();
  }

  resetCode(): void {
    // Reset to original template
    if (this.question?.codeTemplates && this.question.codeTemplates[this.selectedLanguage]) {
      this.editor.setValue(this.question.codeTemplates[this.selectedLanguage]);
    } else if (this.question?.codeTemplate) {
      this.editor.setValue(this.question.codeTemplate);
    } else {
      this.editor.setValue('');
    }
  }

  runCode(): void {
    this.isRunning = true;
    this.consoleOutput = '';
    this.testResults = [];
    this.showConsole = true;
    
    this.codeExecutionService.executeCode({
      code: this.code,
      language: this.selectedLanguage,
      questionId: this.question?._id,
      testCases: this.question?.testCases || []
    }).subscribe({
      next: (response) => {
        this.isRunning = false;
        this.testResults = response.testResults || [];
        this.consoleOutput = response.consoleOutput || '';
      },
      error: (error) => {
        this.isRunning = false;
        this.consoleOutput = `Error: ${error.error?.message || 'Failed to execute code'}`;
      }
    });
  }

  submitCode(): void {
    this.isSubmitting = true;
    console.log("Submitting code: ",this.code);
    // if (this.onSubmitCode) {
    //   this.onSubmitCode(this.code, this.selectedLanguage);
    //   this.isSubmitting = false;
    // }
  }

  toggleConsole(): void {
    this.showConsole = !this.showConsole;
  }

  allTestsPassed(): boolean {
    if (!this.testResults.length) return false;
    return this.testResults.every(test => test.passed);
  }
}