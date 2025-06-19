import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';
import { Report, ReportFilters } from '../../models/report';
import { ToastService } from '../../services/toast.service';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  providers: [DatePipe],
})
export class ReportsComponent implements OnInit {
  reports: Report[] = [];
  filteredReports: Report[] = [];
  filters: ReportFilters = {
  };

  // Add Math for template
  Math = Math;

  loading: boolean = false;
  totalReports: number = 0;
  totalPages: number = 0;
  showFilters: boolean = false;

  interviewTypes: string[] = [
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Data Scientist',
    'QA Engineer',
    'Senior Software Hiring'
  ];

  constructor(
    private reportService: ReportService,
    private toastService: ToastService,
    private datePipe: DatePipe,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    
    // Create a copy of filters to modify before sending
    const queryParams = { ...this.filters };
    
    // Format dates for API if they exist
    if (queryParams.startDate) {
      // Ensure startDate is set to beginning of day
      const startDate = new Date(queryParams.startDate);
      startDate.setHours(0, 0, 0, 0);
      queryParams.startDate = startDate.toISOString();
    }
    
    if (queryParams.endDate) {
      // Ensure endDate is set to end of day
      const endDate = new Date(queryParams.endDate);
      endDate.setHours(23, 59, 59, 999);
      queryParams.endDate = endDate.toISOString();
    }
    
    this.reportService.getAllReports(queryParams).subscribe({
      next: (response) => {
        this.reports = response.data.reports;
        this.filteredReports = [...this.reports];
        this.totalReports = response.data.pagination.total;
        this.totalPages = response.data.pagination.pages;
        this.loading = false;
      },
      error: (error) => {
        this.toastService.error('Failed to load reports');
        console.error('Error loading reports:', error);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filters.page = 1; // Reset to first page when applying new filters
    this.loadReports();
  }

  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: 10,
      interviewType: '',
      candidateName: '',
      startDate: '',
      endDate: ''
    };
    this.loadReports();
  }

  changePage(page: number): void {
    this.filters.page = page;
    this.loadReports();
  }

  getPageArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  formatDate(date: string): string {
    return this.datePipe.transform(date, 'MM/dd/yyyy, h:mm a') || '';
  }

  generateNewReport(): void {
    // This would typically open a modal to select an interview to generate a report for
    this.toastService.info('Select an interview to generate a report');
    // For now, we'll just show a message
  }

  downloadReport(reportId: string): void {
    this.toastService.info('Preparing PDF for download...');

    // First, get the report data
    this.reportService.getReportById(reportId).subscribe({
      next: (response) => {
        const report = response.data;

        try {
          // Generate PDF on the client side
          const pdfBlob = this.pdfService.generateReportPDF(report);

          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');

          // Create a meaningful filename
          const candidateName =
            report?.candidateId?.name?.replace(/\s+/g, '_') || 'candidate';
          const date =
            this.datePipe.transform(report?.createdAt, 'yyyyMMdd') || 'report';
          const filename = `${candidateName}_${date}_report.pdf`;

          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();

          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);

          this.toastService.success('Report downloaded successfully');
        } catch (error) {
          console.error('Error generating PDF:', error);
          this.toastService.error('Failed to generate PDF report');
        }
      },
      error: (error) => {
        this.toastService.error('Failed to load report data');
        console.error('Error loading report:', error);
      },
    });
  }

  // Helper method to check if date is valid
  isValidDate(date: string): boolean {
    return date ? !isNaN(new Date(date).getTime()) : true;
  }

  // Helper method to format date for display
  formatFilterDate(date: string): string {
    return date ? this.datePipe.transform(date, 'MM/dd/yyyy') || '' : '';
  }
}