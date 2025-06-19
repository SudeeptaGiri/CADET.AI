import { TestBed } from '@angular/core/testing';

import { ScheduleInterviewService } from './schedule-interview.service';

describe('ScheduleInterviewService', () => {
  let service: ScheduleInterviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleInterviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
