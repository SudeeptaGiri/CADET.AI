import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterviewAccessComponent } from './interview-access.component';

describe('InterviewAccessComponent', () => {
  let component: InterviewAccessComponent;
  let fixture: ComponentFixture<InterviewAccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterviewAccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterviewAccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
