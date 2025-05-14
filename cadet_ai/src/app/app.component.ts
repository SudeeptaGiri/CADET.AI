import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScheduleInterviewComponent } from './components/schedule-interview/schedule-interview.component';
@Component({
  selector: 'app-root',
  imports: [ScheduleInterviewComponent,],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'cadet_ai';
}
