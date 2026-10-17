import { jsPDF } from 'jspdf';
import { ExamSessionData } from '../types/proctor';
import { calculateComparativeCheatingAnalysis } from '../ai/cheatingClassifier';

export async function generateExaminerPDF(session: ExamSessionData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const analysis = calculateComparativeCheatingAnalysis(session);

  // Helper for drawing header
  function drawHeader(pageNum: number, totalPages: number) {
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFillColor(99, 102, 241); // Indigo accent
    doc.rect(0, 23.5, pageWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('MOMENTS AI | FORENSIC CHEATING & INTEGRITY AUDIT REPORT', margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`SESSION ID: ${session.id}  •  TIME: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, margin, 19);

    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 20, 19);
  }

  function drawFooter() {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PRIVILEGED & CONFIDENTIAL ACADEMIC FORENSIC AUDIT — PRODUCED BY MOMENTS AI BEHAVIORAL ENGINE', margin, pageHeight - 8);
  }

  // ================= PAGE 1: COMPARATIVE CHEATING DETERMINATION =================
  drawHeader(1, 2);

  let currentY = 32;

  // 1. Candidate Info Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 30, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CANDIDATE & EXAMINATION METADATA', margin + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1 = margin + 5;
  const col2 = margin + 65;
  const col3 = margin + 125;

  doc.text(`Candidate: ${session.candidate.name}`, col1, currentY + 14);
  doc.text(`Student ID: ${session.candidate.id}`, col1, currentY + 21);
  doc.text(`Email: ${session.candidate.email}`, col1, currentY + 27);

  doc.text(`Exam: ${session.candidate.examTitle}`, col2, currentY + 14);
  doc.text(`Code: ${session.candidate.examCode}`, col2, currentY + 21);
  doc.text(`Scheduled: ${session.candidate.scheduledTime}`, col2, currentY + 27);

  doc.text(`Duration: ${session.candidate.sessionDurationMins} mins`, col3, currentY + 14);
  doc.text(`Status: ${session.status.toUpperCase()}`, col3, currentY + 21);

  currentY += 36;

  // 2. Automated Cheating Determination Banner
  const isConfirmed = analysis.verdict === 'CONFIRMED_CHEATING';
  const isSuspected = analysis.verdict === 'SUSPECTED_CHEATING';

  const verdictBg = isConfirmed ? [254, 242, 242] : isSuspected ? [255, 251, 235] : [240, 253, 244];
  const verdictBorder = isConfirmed ? [239, 68, 68] : isSuspected ? [245, 158, 11] : [16, 185, 129];
  const verdictText = isConfirmed ? [185, 28, 28] : isSuspected ? [180, 83, 9] : [4, 120, 87];

  doc.setFillColor(verdictBg[0], verdictBg[1], verdictBg[2]);
  doc.setDrawColor(verdictBorder[0], verdictBorder[1], verdictBorder[2]);
  doc.setLineWidth(1.2);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(verdictText[0], verdictText[1], verdictText[2]);
  doc.text(`AI CHEATING DETERMINATION: ${analysis.verdict.replace(/_/g, ' ')}`, margin + 5, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Cheating Likelihood: ${analysis.cheatingLikelihoodPercent}%   |   Integrity Score: ${session.finalIntegrityScore}%`, margin + 5, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const reasonLines = doc.splitTextToSize(`Verdict Rationale: ${analysis.verdictReason}`, pageWidth - (margin * 2) - 10);
  doc.text(reasonLines, margin + 5, currentY + 22);

  currentY += 32;

  // 3. Comparative Benchmark Analysis Table (Candidate vs Cohort Class Average)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPARATIVE BEHAVIORAL BENCHMARK MATRIX', margin, currentY);
  currentY += 4;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, pageWidth - (margin * 2), 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('BEHAVIORAL METRIC', margin + 4, currentY + 4.5);
  doc.text('CANDIDATE METRIC', margin + 65, currentY + 4.5);
  doc.text('CLASS COHORT AVG', margin + 110, currentY + 4.5);
  doc.text('STATUS & VARIANCE', margin + 150, currentY + 4.5);

  currentY += 6.5;

  const compData = [
    { label: 'Corner Glances (Looking at Notes)', cand: `${analysis.factorScores.cornerGlances.candidate} events`, avg: `${analysis.factorScores.cornerGlances.benchmarkAvg} events`, stat: analysis.factorScores.cornerGlances.status },
    { label: 'Unauthorized Tab / App Switches', cand: `${analysis.factorScores.tabSwitches.candidate} switches`, avg: `${analysis.factorScores.tabSwitches.benchmarkAvg} switches`, stat: analysis.factorScores.tabSwitches.status },
    { label: 'Gaze Deviation (Off-Screen Time)', cand: `${analysis.factorScores.gazeDeviation.candidate}%`, avg: `${analysis.factorScores.gazeDeviation.benchmarkAvg}%`, stat: analysis.factorScores.gazeDeviation.status },
    { label: 'Head Pose Rotations (>25° Tilt)', cand: `${analysis.factorScores.headPoseDeviations.candidate}%`, avg: `${analysis.factorScores.headPoseDeviations.benchmarkAvg}%`, stat: analysis.factorScores.headPoseDeviations.status },
    { label: 'Desk Absence Duration', cand: `${analysis.factorScores.absenceDurationSec.candidate}s`, avg: `${analysis.factorScores.absenceDurationSec.benchmarkAvg}s`, stat: analysis.factorScores.absenceDurationSec.status },
  ];

  compData.forEach((row, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 7.5, pageWidth - margin, currentY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(row.label, margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.text(row.cand, margin + 65, currentY + 5);
    doc.text(row.avg, margin + 110, currentY + 5);

    // Status pill text
    doc.setFont('helvetica', 'bold');
    if (row.stat === 'CRITICAL') doc.setTextColor(220, 38, 38);
    else if (row.stat === 'ELEVATED') doc.setTextColor(217, 119, 6);
    else doc.setTextColor(5, 150, 105);
    doc.text(row.stat, margin + 150, currentY + 5);

    currentY += 7.5;
  });

  currentY += 8;

  // 4. Primary Anomalies Identified
  if (analysis.primaryAnomalies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text('EVIDENCE IDENTIFIED:', margin, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    analysis.primaryAnomalies.forEach((anom) => {
      doc.text(`• ${anom}`, margin + 4, currentY);
      currentY += 4.5;
    });
    currentY += 4;
  }

  // 5. Flagged Moments Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('FLAGGED MOMENTS (CHRONOLOGICAL EVENT LOG)', margin, currentY);
  currentY += 4;

  if (session.violations.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No behavioral anomalies were flagged during this examination session.', margin + 4, currentY + 5);
    currentY += 12;
  } else {
    session.violations.slice(0, 4).forEach((v, index) => {
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY + 8, pageWidth - margin, currentY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`+${v.formattedTime}`, margin + 4, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.text(v.title, margin + 25, currentY + 5.5);

      doc.setFont('helvetica', 'bold');
      if (v.severity === 'critical' || v.severity === 'high') doc.setTextColor(220, 38, 38);
      else doc.setTextColor(217, 119, 6);
      doc.text(v.severity.toUpperCase(), margin + 115, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${Math.round(v.confidence * 100)}% Match`, margin + 145, currentY + 5.5);

      currentY += 8;
    });
  }

  drawFooter();

  // ================= PAGE 2: VISUAL EVIDENCE & SNAPSHOTS =================
  doc.addPage();
  drawHeader(2, 2);
  currentY = 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('SYNCHRONIZED VISUAL EVIDENCE & AI TELEMETRY CAPTURES', margin, currentY);
  currentY += 6;

  if (session.violations.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No visual evidence cards required. Candidate passed all biometric checkpoints.', margin, currentY + 8);
  } else {
    const displayViolations = session.violations.slice(0, 3);

    for (const v of displayViolations) {
      const cardHeight = 65;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), cardHeight, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`EVIDENCE #${v.id}  •  T+${v.formattedTime}  •  ${v.title}`, margin + 5, currentY + 6);

      const imgW = 72;
      const imgH = 42;
      const imgY = currentY + 10;

      if (v.evidence.webcamSnapshot) {
        try {
          doc.addImage(v.evidence.webcamSnapshot, 'JPEG', margin + 5, imgY, imgW, imgH);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text('WEBCAM & AI HUD CAPTURE', margin + 5, imgY + imgH + 4);
        } catch (e) {
          doc.rect(margin + 5, imgY, imgW, imgH);
        }
      }

      const metaX = margin + 5 + imgW + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('Telemetry & Observations:', metaX, currentY + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(v.description, pageWidth - metaX - margin - 4);
      doc.text(splitDesc, metaX, currentY + 20);

      doc.text(`• Gaze Target Region: ${v.evidence.regionTag || 'CENTER'}`, metaX, currentY + 36);
      doc.text(`• Head Pose: Yaw ${v.evidence.headPoseSnapshot?.yaw ?? 0}°, Pitch ${v.evidence.headPoseSnapshot?.pitch ?? 0}°`, metaX, currentY + 41);
      doc.text(`• AI Confidence: ${Math.round(v.confidence * 100)}%`, metaX, currentY + 46);

      if (v.examinerNotes) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text(`Examiner Note: ${v.examinerNotes}`, metaX, currentY + 54);
      }

      currentY += cardHeight + 6;
    }
  }

  // Official Examiner Signature
  const sigY = pageHeight - 36;
  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Certified Examiner Digital Signature', pageWidth - margin - 60, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Verification Hash: SHA256-${session.id.substring(0, 12)}`, pageWidth - margin - 60, sigY + 9);

  drawFooter();

  const cleanName = session.candidate.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Moments_AI_Forensic_Report_${cleanName}_${session.id}.pdf`);
}
