import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ScheduleInterviewService } from '../../services/schedule-interview.service';
import { InterviewFormData } from '../../models/interview.model';
import { trigger, transition, style, animate } from '@angular/animations';
import { json } from 'express';

@Component({
  selector: 'app-schedule-interview',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './schedule-interview.component.html',
  styleUrls: ['./schedule-interview.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ScheduleInterviewComponent implements OnInit {
  interviewForm!: FormGroup;
  submitted = false;
  isSubmitting = false;
  difficultyLabel = 'Intermediate';
  minDate: string;
  isLoadingTopics = false;
  
  // Interview types
  interviewTypes = [
    'Tech Check Interview',
    'Golden Certificate',
    'Campus Hiring',
    'Senior Software Hiring',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist'
  ];
  
  // Topics
  availableTopics: string[] = [];
  selectedTopics: string[] = [];

  constructor(
    private fb: FormBuilder,
    private interviewService: ScheduleInterviewService
  ) {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initForm();
    this.loadTopics();
    this.loadInterviewTypes();
  }

  initForm(): void {
    this.interviewForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      interviewType: ['', Validators.required],
      candidateName: ['', Validators.required],
      candidateEmail: ['', [Validators.required, Validators.email]],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      duration: [30, [Validators.required, Validators.min(15)]],
      difficultyLevel: [2] // Default to intermediate (2)
    });

    // Update difficulty label on init
    this.updateDifficultyLabel();
  }

  // Load available topics from API
  loadTopics(): void {
    this.isLoadingTopics = true;
    this.interviewService.getAvailableTopics()
      .subscribe({
        next: (topics) => {
          console.log('Available topics:', topics);
          this.availableTopics = topics.data || [];
          this.isLoadingTopics = false;
        },
        error: (error) => {
          console.error('Error loading topics:', error);
          this.isLoadingTopics = false;
          
          // Fallback topics in case API fails
          this.availableTopics = [
            'JavaScript', 'TypeScript', 'Angular', 'React', 'Vue', 
            'Node.js', 'Express', 'MongoDB', 'SQL', 'GraphQL',
            'AWS', 'Docker', 'Kubernetes', 'System Design', 'Data Structures',
            'Algorithms', 'Testing', 'CI/CD', 'DevOps', 'Agile'
          ];
        }
      });
  }

  // Load available interview types from API
  loadInterviewTypes(): void {
    this.interviewService.getInterviewTypes()
      .subscribe({
        next: (types) => {
          if (types && types.length > 0) {
            this.interviewTypes = types;
          }
        },
        error: (error) => {
          console.error('Error loading interview types:', error);
          // Keep using the default types defined in the component
        }
      });
  }

  // Handle topic selection
  onTopicChange(topic: string, event: any): void {
    const isChecked = event.target.checked;

    if (isChecked) {
      this.selectedTopics.push(topic);
    } else {
      this.selectedTopics = this.selectedTopics.filter(t => t !== topic);
    }
  }

  // Check if a topic is selected
  isTopicSelected(topic: string): boolean {
    return this.selectedTopics.includes(topic);
  }

  // Update difficulty label based on slider value
  updateDifficultyLabel(): void {
    const difficultyValue = this.interviewForm.get('difficultyLevel')?.value;
    
    switch (difficultyValue) {
      case 1:
        this.difficultyLabel = 'beginner';
        break;
      case 2:
        this.difficultyLabel = 'intermediate';
        break;
      case 3:
        this.difficultyLabel = 'advanced';
        break;
      default:
        this.difficultyLabel = 'intermediate';
    }
  }

  // Form submission
  onSubmit(): void {
    this.submitted = true;

    // Stop if form is invalid
    if (this.interviewForm.invalid || this.selectedTopics.length === 0) {
      console.error('Form is invalid or no topics selected');
      return;
    }

    this.isSubmitting = true;

    const formData: InterviewFormData = {
      ...this.interviewForm.value,
      topics: this.selectedTopics,
      difficulty: this.difficultyLabel
    };
    console.log('Form data:', formData);
    this.interviewService.createInterview(formData)
      .subscribe({
        next: (response) => {
          console.log('Interview scheduled successfully:', response);
          this.isSubmitting = false;
          alert('Interview scheduled successfully!');
          this.resetForm();
        },
        error: (error) => {
          console.error('Error scheduling interview:', error);
          this.isSubmitting = false;
          alert(`Failed to schedule interview: ${error.error?.message || 'Unknown error'}`);
        }
      });
  }

  // Reset form
  resetForm(): void {
    this.submitted = false;
    this.selectedTopics = [];
    this.interviewForm.reset({
      title: '',
      description: '',
      interviewType: '',
      candidateName: '',
      candidateEmail: '',
      scheduledDate: '',
      scheduledTime: '',
      duration: 30,
      difficultyLevel: 2
    });
    this.updateDifficultyLabel();
  }

  // Cancel and reset
  onCancel(): void {
    this.resetForm();
  }
}