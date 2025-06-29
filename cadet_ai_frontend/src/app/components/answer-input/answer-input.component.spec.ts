import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerInputComponent } from './answer-input.component';

describe('AnswerInputComponent', () => {
  let component: AnswerInputComponent;
  let fixture: ComponentFixture<AnswerInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
