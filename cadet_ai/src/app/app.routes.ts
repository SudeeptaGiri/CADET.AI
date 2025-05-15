// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { InterviewAccessComponent } from './components/interview-access/interview-access.component';
import { InterviewListComponent } from './components/interview-list/interview-list.component';
import { ScheduleInterviewComponent } from './components/schedule-interview/schedule-interview.component';
import { InterviewRoomComponent } from './components/interview-room/interview-room.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/access', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'access', component: InterviewAccessComponent },
  { 
    path: 'interviews', 
    component: InterviewListComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'interviews/create', 
    component: ScheduleInterviewComponent, 
    canActivate: [AuthGuard, AdminGuard] 
  },
  { 
    path: 'interview-room/:id', 
    component: InterviewRoomComponent, 
    canActivate: [AuthGuard] 
  },
  { path: '**', redirectTo: '/access' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }