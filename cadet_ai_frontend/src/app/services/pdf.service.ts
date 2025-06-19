import { Injectable } from '@angular/core';
import { Report } from '../models/report';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  
  constructor() { }
  
  generateReportPDF(report: Report): Blob {
    // Create a new document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Define colors
    const primaryColor = [41, 128, 185] as [number, number, number]; // Blue
    const secondaryColor = [44, 62, 80] as [number, number, number]; // Dark blue
    const accentColor = [46, 204, 113] as [number, number, number]; // Green
    const warningColor = [230, 126, 34] as [number, number, number]; // Orange
    const dangerColor = [231, 76, 60] as [number, number, number]; // Red
    
    // Add header with gradient background
    doc.setFillColor(41, 128, 185); // Blue
    doc.rect(0, 0, 210, 25, 'F');
    doc.setFillColor(52, 152, 219); // Lighter blue
    doc.rect(0, 25, 210, 5, 'F');
    
    // Add title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('CADET.AI Interview Report', 105, 15, { align: 'center' });
    
    // Add report generation date
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 195, 22, { align: 'right' });
    
    // Add candidate info box
    const candidateY = 40;
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, candidateY, 90, 40, 3, 3, 'FD');
    
    // Candidate avatar circle
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(25, candidateY + 15, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    const initials = report.candidateId?.name ? 
      (report.candidateId.name.split(' ')[0][0] + (report.candidateId.name.split(' ')[1] ? report.candidateId.name.split(' ')[1][0] : '')).toUpperCase() : 
      'U';
    doc.text(initials, 25, candidateY + 17, { align: 'center' });
    
    // Candidate details
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Candidate Information', 45, candidateY + 10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${report.candidateId?.name || 'Unknown'}`, 45, candidateY + 18);
    doc.text(`Email: ${report.candidateId?.email || 'N/A'}`, 45, candidateY + 26);
    
    // Add interview details box
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(110, candidateY, 90, 40, 3, 3, 'FD');
    
    // Interview icon
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(125, candidateY + 15, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('I', 125, candidateY + 17, { align: 'center' });
    
    // Interview details
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Interview Details', 145, candidateY + 10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Type: ${report.interviewId?.interviewType || 'N/A'}`, 145, candidateY + 18);
    doc.text(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, 145, candidateY + 26);
    doc.text(`Duration: ${report.interviewId?.duration || 'N/A'} minutes`, 145, candidateY + 34);
    
    // Add overall rating box
    const ratingY = candidateY + 50;
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, ratingY, 190, 25, 3, 3, 'FD');
    
    // Rating label
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Rating', 20, ratingY + 10);
    
    // Rating value
    const rating = report.overallRating || 0;
    let ratingColor = dangerColor; // Default red
    
    if (rating >= 8) {
      ratingColor = accentColor; // Green for high ratings
    } else if (rating >= 6) {
      ratingColor = warningColor; // Orange for medium ratings
    }
    
    doc.setFontSize(16);
    doc.setTextColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    doc.text(`${rating.toFixed(1)}/10`, 60, ratingY + 10);
    
    // Rating bar
    const barWidth = 100;
    const filledWidth = (rating / 10) * barWidth;
    
    // Background bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(90, ratingY + 5, barWidth, 10, 2, 2, 'F');
    
    // Filled bar
    doc.setFillColor(ratingColor[0], ratingColor[1], ratingColor[2]);
    if (filledWidth > 0) {
      doc.roundedRect(90, ratingY + 5, filledWidth, 10, 2, 2, 'F');
    }
    
    // Technical Assessment Section
    const techY = ratingY + 35;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, techY, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Assessment', 15, techY + 5.5);
    
    // Technical ratings
    const techDetailsY = techY + 15;
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Implementation rating
    const implRating = report.technicalAssessment?.implementationRating || 0;
    let implColor = dangerColor;
    if (implRating >= 8) implColor = accentColor;
    else if (implRating >= 6) implColor = warningColor;
    
    doc.text('Implementation:', 20, techDetailsY);
    doc.setTextColor(implColor[0], implColor[1], implColor[2]);
    doc.text(`${implRating.toFixed(1)}/10`, 70, techDetailsY);
    
    // Implementation bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(90, techDetailsY - 4, barWidth, 6, 1, 1, 'F');
    doc.setFillColor(implColor[0], implColor[1], implColor[2]);
    if (implRating > 0) {
      doc.roundedRect(90, techDetailsY - 4, (implRating / 10) * barWidth, 6, 1, 1, 'F');
    }
    
    // Theoretical rating
    const theoRating = report.technicalAssessment?.theoreticalRating || 0;
    let theoColor = dangerColor;
    if (theoRating >= 8) theoColor = accentColor;
    else if (theoRating >= 6) theoColor = warningColor;
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('Theoretical:', 20, techDetailsY + 10);
    doc.setTextColor(theoColor[0], theoColor[1], theoColor[2]);
    doc.text(`${theoRating.toFixed(1)}/10`, 70, techDetailsY + 10);
    
    // Theoretical bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(90, techDetailsY + 6, barWidth, 6, 1, 1, 'F');
    doc.setFillColor(theoColor[0], theoColor[1], theoColor[2]);
    if (theoRating > 0) {
      doc.roundedRect(90, techDetailsY + 6, (theoRating / 10) * barWidth, 6, 1, 1, 'F');
    }
    
    // Topic assessments table
    let finalY = techDetailsY + 20;
    if (report.technicalAssessment?.topicAssessments && report.technicalAssessment.topicAssessments.length > 0) {
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Topic Assessments', 20, finalY);
      finalY += 5;
      
      const topicHeaders = [['Topic', 'Score', 'Type', 'Comments']];
      const topicData = report.technicalAssessment.topicAssessments.map(topic => {
        let color = topic.isStrength ? accentColor : dangerColor;
        return [
          topic.topic,
          {
            content: `${topic.score.toFixed(1)}/10`,
            styles: { textColor: topic.score >= 8 ? accentColor : (topic.score >= 6 ? warningColor : dangerColor) }
          },
          {
            content: topic.isStrength ? 'Strength' : 'Weakness',
            styles: { textColor: color }
          },
          topic.comments
        ];
      });
      
      // Use autoTable with better styling
      autoTable(doc, {
        startY: finalY,
        head: topicHeaders,
        body: topicData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor, 
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 'auto' }
        },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        margin: { left: 10, right: 10 }
      });
      
      // Get the final Y position after the table
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Check if we need a new page
    if (finalY > 270) {
      doc.addPage();
      finalY = 20;
    }
    
    // Behavioral Analysis Section
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, finalY, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Behavioral Analysis', 15, finalY + 5.5);
    
    const behavioralY = finalY + 15;
    
    // Sentiment box
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, behavioralY, 90, 30, 3, 3, 'FD');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sentiment Analysis', 20, behavioralY + 10);
    
    // Sentiment value
    const sentiment = report.behavioralAnalysis?.sentiment || 'Neutral';
    let sentimentColor = primaryColor; // Default blue
    
    if (sentiment === 'Positive') {
      sentimentColor = accentColor; // Green
    } else if (sentiment === 'Negative') {
      sentimentColor = dangerColor; // Red
    } else if (sentiment === 'Neutral') {
      sentimentColor = warningColor; // Orange
    }
    
    // Sentiment badge
    doc.setFillColor(sentimentColor[0], sentimentColor[1], sentimentColor[2]);
    doc.roundedRect(20, behavioralY + 15, 30, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(sentiment, 35, behavioralY + 20, { align: 'center' });
    
    // Confidence box
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(110, behavioralY, 90, 30, 3, 3, 'FD');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Confidence Rating', 120, behavioralY + 10);
    
    // Confidence value
    const confidence = report.behavioralAnalysis?.confidence || 0;
    let confidenceColor = dangerColor;
    if (confidence >= 8) confidenceColor = accentColor;
    else if (confidence >= 6) confidenceColor = warningColor;
    
    doc.setTextColor(confidenceColor[0], confidenceColor[1], confidenceColor[2]);
    doc.setFontSize(14);
    doc.text(`${confidence.toFixed(1)}/10`, 120, behavioralY + 22);
    
    // Confidence bar
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(150, behavioralY + 18, 40, 6, 1, 1, 'F');
    doc.setFillColor(confidenceColor[0], confidenceColor[1], confidenceColor[2]);
    if (confidence > 0) {
      doc.roundedRect(150, behavioralY + 18, (confidence / 10) * 40, 6, 1, 1, 'F');
    }
    
    // Communication metrics
    const commY = behavioralY + 40;
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Communication Metrics', 20, commY);
    
    // Create a table for communication metrics
    const commHeaders = [['Metric', 'Value', 'Rating']];
    const commData = [
      [
        'Articulation Clarity',
        `${report.behavioralAnalysis?.articulationClarity?.toFixed(1) || 'N/A'}/10`,
        ''
      ],
      [
        'Filler Word Usage',
        `${report.behavioralAnalysis?.fillerWordFrequency || 'N/A'} instances`,
        report.behavioralAnalysis?.fillerWordFrequency <= 10 ? 'Low' : 
          (report.behavioralAnalysis?.fillerWordFrequency <= 20 ? 'Moderate' : 'High')
      ]
    ];
    
    autoTable(doc, {
      startY: commY + 5,
      head: commHeaders,
      body: commData,
      theme: 'grid',
      headStyles: { 
        fillColor: [52, 152, 219], 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60, halign: 'center' },
        2: { cellWidth: 60, halign: 'center' }
      },
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      margin: { left: 10, right: 10 }
    });
    
    // Get the final Y position after the table
    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Integrity Verification
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Integrity Verification', 20, finalY);
    
    // Create integrity verification boxes
    const integrityY = finalY + 5;
    const boxWidth = 85;
    const boxHeight = 20;
    
    // Impersonation box
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, integrityY, boxWidth, boxHeight, 3, 3, 'FD');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Impersonation Detection', 20, integrityY + 8);
    
    // Impersonation status badge
    const impersonationDetected = report.integrityVerification?.impersonationDetected || false;
    const impersonationColor = impersonationDetected ? dangerColor : accentColor;
    const impersonationText = impersonationDetected ? 'DETECTED' : 'NONE';
    
    doc.setFillColor(impersonationColor[0], impersonationColor[1], impersonationColor[2]);
    doc.roundedRect(20, integrityY + 12, 30, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(impersonationText, 35, integrityY + 16, { align: 'center' });
    
    // Conduct compliance box
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(105, integrityY, boxWidth, boxHeight, 3, 3, 'FD');
    
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Conduct Compliance', 115, integrityY + 8);
    
    // Conduct compliance badge
    const conductCompliance = report.integrityVerification?.conductCompliance || false;
    const conductColor = conductCompliance ? accentColor : dangerColor;
    const conductText = conductCompliance ? 'COMPLIANT' : 'NON-COMPLIANT';
    
    doc.setFillColor(conductColor[0], conductColor[1], conductColor[2]);
    doc.roundedRect(115, integrityY + 12, 40, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(conductText, 135, integrityY + 16, { align: 'center' });
    
    // Anomalies section
    finalY = integrityY + boxHeight + 10;
    
    if (report.integrityVerification?.anomaliesDetected && report.integrityVerification.anomaliesDetected.length > 0) {
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Detected Anomalies:', 20, finalY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      report.integrityVerification.anomaliesDetected.forEach((anomaly, index) => {
        doc.setFillColor(250, 240, 240);
        doc.roundedRect(20, finalY + 5 + (index * 10), 170, 8, 1, 1, 'F');
        
        doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
        doc.text(`• ${anomaly}`, 25, finalY + 10 + (index * 10));
      });
      
      finalY += 5 + (report.integrityVerification.anomaliesDetected.length * 10) + 10;
    }
    
    // Check if we need a new page for recommendations
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    
    // Recommendations Section
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, finalY, 190, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendations', 15, finalY + 5.5);
    
    // Recommendations content
    const recommendationsY = finalY + 15;
    
    if (report.recommendations) {
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(10, recommendationsY, 190, 40, 3, 3, 'FD');
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const splitRecommendations = doc.splitTextToSize(report.recommendations, 170);
      doc.text(splitRecommendations, 20, recommendationsY + 10);
    } else {
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('No recommendations provided.', 20, recommendationsY + 10);
    }
    
    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 280, 200, 280);
      
      // Footer text
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated by CADET.AI | Confidential Interview Report | Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
    }
    
    return doc.output('blob');
  }
}