// code-execution.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CodeExecutionService {
  private apiUrl = environment.apiUrl + '/code-execution';

  constructor(private http: HttpClient) { }

  executeCode(data: {
    code: string;
    language: string;
    questionId: string;
    testCases?: any[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/run`, data);
  }
}