import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private recognition: any;
  private isListening = false;
  
  private transcriptSubject = new BehaviorSubject<string>('');
  transcript$ = this.transcriptSubject.asObservable();
  
  private isListeningSubject = new BehaviorSubject<boolean>(false);
  isListening$ = this.isListeningSubject.asObservable();

  constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.transcriptSubject.next(transcript);
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        this.stopListening();
      };
      
      this.recognition.onend = () => {
        if (this.isListening) {
          // If we're supposed to be listening but recognition ended, restart it
          this.recognition.start();
        } else {
          this.isListeningSubject.next(false);
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser');
    }
  }

  startListening(): void {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return;
    }
    
    this.isListening = true;
    this.isListeningSubject.next(true);
    this.transcriptSubject.next('');
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition', e);
    }
  }

  stopListening(): void {
    if (!this.recognition) return;
    
    this.isListening = false;
    this.isListeningSubject.next(false);
    
    try {
      this.recognition.stop();
    } catch (e) {
      console.error('Error stopping speech recognition', e);
    }
  }

  updateTranscript(text: string): void {
    this.transcriptSubject.next(text);
  }
}