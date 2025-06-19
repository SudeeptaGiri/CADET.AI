import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReportService } from '../../services/report.service';
import { Report } from '../../models/report';
import { ToastService } from '../../services/toast.service';
import { saveAs } from 'file-saver';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-report-view',
  templateUrl: './report-view.component.html',
  styleUrls: ['./report-view.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [DatePipe],
})
export class ReportViewComponent implements OnInit {
  report: Report | null = null;
  loading: boolean = true;
  error: string | null = null;

  // For radar chart data
  chartData = {
    labels: [
      'Implementation',
      'Theoretical',
      'Confidence',
      'Articulation',
      'Overall',
    ],
    datasets: [
      {
        label: 'Candidate Performance',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderColor: 'rgba(56, 189, 248, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(56, 189, 248, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(56, 189, 248, 1)',
      },
    ],
  };

  chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2,
        },
      },
    },
  };

  constructor(
    private reportService: ReportService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private datePipe: DatePipe,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const reportId = params.get('id');
      if (reportId) {
        this.loadReport(reportId);
      } else {
        this.error = 'Report ID not provided';
        this.loading = false;
      }
    });
  }

  loadReport(id: string): void {
    this.loading = true;
    this.reportService.getReportById(id).subscribe({
      next: (response) => {
        this.report = response.data;
        this.loading = false;
        this.prepareChartData();
      },
      error: (error) => {
        this.error = 'Failed to load report';
        this.loading = false;
        this.toastService.error('Failed to load report details');
        console.error('Error loading report:', error);
      },
    });
  }

  prepareChartData(): void {
    if (this.report) {
      this.chartData.datasets[0].data = [
        this.report.technicalAssessment.implementationRating,
        this.report.technicalAssessment.theoreticalRating,
        this.report.behavioralAnalysis.confidence,
        this.report.behavioralAnalysis.articulationClarity,
        this.report.overallRating,
      ];
    }
  }
downloadReport(): void {
  if (!this.report) return;
  
  this.toastService.info('Generating PDF...');
  
  try {
    // Generate PDF on the client side
    const pdfBlob = this.pdfService.generateReportPDF(this.report);
    
    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    
    // Create a meaningful filename
    const candidateName = this.report?.candidateId?.name?.replace(/\s+/g, '_') || 'candidate';
    const date = this.datePipe.transform(this.report?.createdAt, 'yyyyMMdd') || 'report';
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
}
  // private saveBlob(blob: Blob): void {
  //   const url = window.URL.createObjectURL(blob);
  //   const a = document.createElement('a');

  //   // Create a meaningful filename
  //   const candidateName =
  //     this.report?.candidateId?.name?.replace(/\s+/g, '_') || 'candidate';
  //   const date =
  //     this.datePipe.transform(this.report?.createdAt, 'yyyyMMdd') || 'report';
  //   const filename = `${candidateName}_${date}_report.pdf`;

  //   a.href = url;
  //   a.download = filename;
  //   document.body.appendChild(a);
  //   a.click();

  //   // Clean up
  //   setTimeout(() => {
  //     document.body.removeChild(a);
  //     window.URL.revokeObjectURL(url);
  //   }, 100);

  //   this.toastService.success('Report downloaded successfully');
  // }

  getRatingClass(rating: number): string {
    if (rating >= 8) return 'text-green-500';
    if (rating >= 6) return 'text-yellow-500';
    return 'text-red-500';
  }

  getSentimentClass(sentiment: string): string {
    if (sentiment === 'Positive') return 'text-green-500';
    if (sentiment === 'Neutral') return 'text-yellow-500';
    return 'text-red-500';
  }

  formatDate(date: string): string {
    return this.datePipe.transform(date, 'MMMM d, yyyy, h:mm a') || '';
  }

  goBack(): void {
    this.router.navigate(['/reports']);
  }
}
