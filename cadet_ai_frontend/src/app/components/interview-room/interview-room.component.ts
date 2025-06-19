// src/app/components/interview-room/interview-room.component.ts
import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { ScheduleInterviewService } from '../../services/schedule-interview.service';

interface Interview {
  _id: string;
  title: string;
  description: string;
  interviewType: string;
  candidateName: string;
  candidateEmail: string;
  scheduledDate: Date;
  duration: number;
  difficulty: string;
  topics: string[];
  status: string;
  accessCode: string;
}

interface TimeRemaining {
  hours: string;
  minutes: string;
  seconds: string;
}

@Component({
  selector: 'app-interview-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-room.component.html',
  styleUrls: ['./interview-room.component.css']
})
export class InterviewRoomComponent  {
  @ViewChild('webcamVideo') webcamVideo!: ElementRef<HTMLVideoElement>;
  
  interview: Interview | null = null;
  isLoading: boolean = true;
  error: string | null = null;
  
  // Stream variables
  private stream: MediaStream | null = null;
  cameraActive: boolean = false;
  micActive: boolean = false;
  
  // Status variables
  faceDetected: boolean = false;
  lightingGood: boolean = false;
  audioDetected: boolean = false;
  audioQualityGood: boolean = false;
  identityVerified: boolean = false;
  interviewStatus: string = 'upcoming';
  remainingInterviewTime: number = 0;
  
  // Audio visualization
  audioLevels: number[] = Array(20).fill(0);
  audioContext: AudioContext | null = null;
  audioAnalyser: AnalyserNode | null = null;
  
  // Time tracking
  timeUntilInterview: TimeRemaining | null = null;
  canStartInterview: boolean = false;
  showPreCheck: boolean = false;
  
  // Subscriptions
  private timerSubscription: Subscription | null = null;
  private audioVisualizerSubscription: Subscription | null = null;
  private faceDetectionSubscription: Subscription | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private toast: ToastService,
    private authService: AuthService,
    private interviewService: ScheduleInterviewService
  ) {}
  
 ngOnInit() {
    // Log available data
    console.log('Token in localStorage:', !!localStorage.getItem('token'));
    console.log('Interview ID in localStorage:', localStorage.getItem('interviewId'));
    
    // Check if user is admin or candidate
    const currentUser = this.authService.getCurrentUser();
    const isAdmin = this.authService.isAdmin();
    
    console.log('Current user role:', currentUser?.role);
    
    // Get interview ID from route params
    this.route.paramMap.subscribe(params => {
      const interviewId = params.get('id');
      console.log('Interview ID from route params:', interviewId);
      
      if (isAdmin && interviewId) {
        // Admin accessing specific interview
        this.loadInterviewAsAdmin(interviewId);
      } else if (!isAdmin) {
        // Candidate accessing their interview
        this.loadInterviewAsCandidate();
      } else {
        this.error = 'No interview ID provided';
        this.isLoading = false;
        this.toast.error('No interview ID provided. Please access the interview using the proper credentials.');
      }
    });
  }
  
  loadInterviewAsAdmin(id: string) {
    this.isLoading = true;
    this.error = null;
    console.log('Loading interview as admin with ID:', id);
    
    this.interviewService.getInterview(id).subscribe({
      next: (response) => {
        console.log('Interview data received:', response);
        if (response && response.data && response.data.interview) {
          this.interview = response.data.interview;
          this.isLoading = false;
          this.startTimeCheck();
        } else {
          this.error = 'Invalid interview data format';
          this.isLoading = false;
          this.toast.error('Failed to load interview details');
        }
      },
      error: (err) => {
        console.error('Error response:', err);
        this.error = 'Failed to load interview details. Please try again.';
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Error loading interview');
      }
    });
  }
  
  loadInterviewAsCandidate() {
    this.isLoading = true;
    this.error = null;
    console.log('Loading interview as candidate');
    
    this.interviewService.getMyInterview().subscribe({
      next: (response) => {
        console.log('Interview data received:', response);
        if (response && response.data && response.data.interview) {
          this.interview = response.data.interview;
          this.isLoading = false;
          this.startTimeCheck();
        } else {
          this.error = 'Invalid interview data format';
          this.isLoading = false;
          this.toast.error('Failed to load interview details');
        }
      },
      error: (err) => {
        console.error('Error response:', err);
        this.error = 'Failed to load interview details. Please try again.';
        this.isLoading = false;
        this.toast.error(err.error?.message || 'Error loading interview');
      }
    });
  }
  
  retryLoading() {
    const isAdmin = this.authService.isAdmin();
    
    if (isAdmin) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.loadInterviewAsAdmin(id);
      } else {
        this.toast.error('No interview ID available to retry');
      }
    } else {
      this.loadInterviewAsCandidate();
    }
  }
  startTimeCheck() {
    console.log('Starting time check for interview:', this.interview);
    if (!this.interview || !this.interview.scheduledDate) {
      return;
    }
    
    // Update time remaining every second
    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateTimeRemaining();
    });
    
    // Initial check
    this.updateTimeRemaining();
  }
  
updateTimeRemaining() {
  if (!this.interview || !this.interview.scheduledDate) {
    return;
  }
  
  // Get current time
  const now = new Date();
  
  // Get scheduled date from database (UTC format)
  const scheduledDate = new Date(this.interview.scheduledDate);
  
  // Adjust scheduled date to be 5 hours and 30 minutes earlier
  const adjustedScheduledDate = new Date(scheduledDate.getTime() - (5 * 60 * 60 * 1000) - (30 * 60 * 1000));
  
  // Calculate time difference in milliseconds using the adjusted date
  const timeDiff = adjustedScheduledDate.getTime() - now.getTime();
  const durationInMs = this.interview.duration * 60 * 1000;
  
  // Also adjust the end time to be 5 hours and 30 minutes earlier
  const adjustedEndTime = adjustedScheduledDate.getTime() + durationInMs;
  
  if (timeDiff > 0) {
    // Future interview - show countdown
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    this.timeUntilInterview = {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
    
    this.interviewStatus = 'upcoming';
    this.canStartInterview = false;
  } 
  else if (now.getTime() <= adjustedEndTime) {
    // Active interview - can be joined
    this.timeUntilInterview = null;
    this.interviewStatus = 'active';
    this.canStartInterview = true;
    
    // Calculate remaining interview time
    const remainingTime = adjustedEndTime - now.getTime();
    const remainingMinutes = Math.floor(remainingTime / (1000 * 60));
    this.remainingInterviewTime = remainingMinutes;
  } 
  else {
    // Expired interview
    this.timeUntilInterview = null;
    this.interviewStatus = 'expired';
    this.canStartInterview = false;
  }
}
  
  formatDate(date: Date | undefined): string {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  }
  
  startPreCheck() {
    this.showPreCheck = true;
    setTimeout(() => {
      this.initializeWebcam();
      this.initializeMicrophone();
    }, 500);
  }
  
  async initializeWebcam() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      console.log('Webcam stream:', this.stream);
      
      if (this.webcamVideo && this.webcamVideo.nativeElement) {
        this.webcamVideo.nativeElement.srcObject = this.stream;
        this.cameraActive = true;
        this.toast.success('Camera activated successfully');
        
        // Start face detection
        this.startFaceDetection();
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      this.cameraActive = false;
      this.toast.error('Failed to access webcam. Please check your camera permissions.');
    }
  }
  
  async initializeMicrophone() {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      this.micActive = true;
      this.toast.success('Microphone activated successfully');
      
      // Set up audio visualization
      this.setupAudioVisualization(audioStream);
      
      // Simulate audio detection
      setTimeout(() => {
        this.audioDetected = true;
        this.audioQualityGood = true;
      }, 2000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      this.micActive = false;
      this.toast.error('Failed to access microphone. Please check your microphone permissions.');
    }
  }
  
  setupAudioVisualization(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 64;
      source.connect(this.audioAnalyser);
      
      const bufferLength = this.audioAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Update audio levels visualization
      this.audioVisualizerSubscription = interval(100).subscribe(() => {
        if (this.audioAnalyser && this.micActive) {
          this.audioAnalyser.getByteFrequencyData(dataArray);
          
          // Calculate average level and update visualization
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          
          const average = sum / bufferLength;
          
          // Generate random-ish levels based on the average for visualization
          for (let i = 0; i < this.audioLevels.length; i++) {
            const randomFactor = 0.7 + Math.random() * 0.6;
            this.audioLevels[i] = Math.min(100, average * randomFactor);
          }
        } else {
          this.audioLevels = Array(20).fill(0);
        }
      });
      
    } catch (err) {
      console.error('Error setting up audio visualization:', err);
      this.toast.error('Error setting up audio visualization');
    }
  }
  
  startFaceDetection() {
    // In a real application, you would use a face detection library like face-api.js
    // For this example, we'll simulate face detection with a timer
    
    // Simulate lighting check
    setTimeout(() => {
      this.lightingGood = true;
    }, 1500);
    
    // Simulate face detection with random success/failure
    this.faceDetectionSubscription = interval(1000).subscribe(() => {
      if (this.cameraActive) {
        // 90% chance of face detection
        this.faceDetected = Math.random() > 0.1;
        
        // After 5 seconds, verify identity if face is consistently detected
        if (this.faceDetected && !this.identityVerified && this.cameraActive) {
          setTimeout(() => {
            if (this.faceDetected && this.cameraActive) {
              this.identityVerified = true;
              this.toast.success('Identity verified successfully');
            }
          }, 5000);
        }
      } else {
        this.faceDetected = false;
      }
    });
  }
  
  toggleCamera() {
    if (this.cameraActive) {
      this.stopWebcam();
      this.toast.info('Camera turned off');
    } else {
      this.initializeWebcam();
    }
  }
  
  toggleMicrophone() {
    if (this.micActive) {
      this.stopMicrophone();
      this.toast.info('Microphone turned off');
    } else {
      this.initializeMicrophone();
    }
  }
  
  stopWebcam() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        if (track.kind === 'video') {
          track.stop();
        }
      });
    }
    
    this.cameraActive = false;
    this.faceDetected = false;
    this.lightingGood = false;
    
    if (this.faceDetectionSubscription) {
      this.faceDetectionSubscription.unsubscribe();
    }
  }
  
  stopMicrophone() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        if (track.kind === 'audio') {
          track.stop();
        }
      });
    }
    
    this.micActive = false;
    this.audioDetected = false;
    this.audioQualityGood = false;
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.audioVisualizerSubscription) {
      this.audioVisualizerSubscription.unsubscribe();
    }
    
    this.audioLevels = Array(20).fill(0);
  }
  
  testMicrophone() {
    // In a real app, you might play a sound and analyze the input
    // For this example, we'll just simulate a test
    const originalValues = [...this.audioLevels];
    
    // Animate audio levels to simulate speaking
    for (let i = 0; i < this.audioLevels.length; i++) {
      setTimeout(() => {
        this.audioLevels[i] = 80 + Math.random() * 20;
        
        // Reset after animation
        setTimeout(() => {
          this.audioLevels[i] = originalValues[i];
        }, 1000);
      }, i * 50);
    }
    
    this.toast.info('Testing microphone...');
  }
  
  allChecksComplete(): boolean {
    return this.cameraActive && this.micActive && this.identityVerified;
  }
  
  startInterview() {
    if (!this.canStartInterview) {
      this.toast.error('The interview is not yet available. Please wait until the scheduled time.');
      return;
    }
    
    if (!this.allChecksComplete()) {
      this.toast.warning('Please complete all system checks before starting the interview.');
      return;
    }
    
    // Navigate to the actual interview room
    if (this.interview) {
      this.router.navigate(['/interview']);
      this.toast.success('Starting interview session...');
    } else {
      this.toast.error('Interview data not available');
    }
  }
}