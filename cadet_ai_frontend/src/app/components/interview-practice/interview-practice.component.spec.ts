import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewPracticeComponent } from './interview-practice.component';

describe('InterviewPracticeComponent', () => {
  let component: InterviewPracticeComponent;
  let fixture: ComponentFixture<InterviewPracticeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewPracticeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewPracticeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
