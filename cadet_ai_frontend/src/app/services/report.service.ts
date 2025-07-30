import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:5000/api/reports';

  constructor(private http: HttpClient) { }

  getAllReports(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    
    // Add all filter parameters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.append(key, filters[key]);
      }
    });

    return this.http.get(this.apiUrl, { params });
  }

  getReportById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getReportsByInterview(interviewId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/interview/${interviewId}`);
  }

  getReportsByCandidate(candidateId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidate/${candidateId}`);
  }

  getReportStats(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.append(key, filters[key]);
      }
    });

    return this.http.get(`${this.apiUrl}/stats`, { params });
  }

  generateAIReport(interviewId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate/${interviewId}`, {});
  }

  downloadReportPDF(reportId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${reportId}/download`, {
      responseType: 'blob'
    });
  }
}