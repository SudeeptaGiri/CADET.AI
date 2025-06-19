import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewRoomComponent } from './interview-room.component';

describe('InterviewRoomComponent', () => {
  let component: InterviewRoomComponent;
  let fixture: ComponentFixture<InterviewRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewRoomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
