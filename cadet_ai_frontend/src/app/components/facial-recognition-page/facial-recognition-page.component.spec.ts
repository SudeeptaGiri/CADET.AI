import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacialRecognitionPageComponent } from './facial-recognition-page.component';

describe('FacialRecognitionPageComponent', () => {
  let component: FacialRecognitionPageComponent;
  let fixture: ComponentFixture<FacialRecognitionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacialRecognitionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacialRecognitionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
