import { jsPDF } from 'jspdf';
import type { ExamSession, CheatingReport } from '../types/index';

export async function exportPDF(session: ExamSession): Promise<void> {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW    = doc.internal.pageSize.getWidth();
  const PH    = doc.internal.pageSize.getHeight();
  const M     = 14;
  const CR    = session.cheatingReport!;
  const P     = session.profile;

  // ── Helpers ────────────────────────────────────────────────────
  const hdr = (pg: number, total: number) => {
    doc.setFillColor(6, 10, 18); doc.rect(0, 0, PW, 22, 'F');
    doc.setFillColor(99, 102, 241); doc.rect(0, 21.5, PW, 1.8, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(255,255,255);
    doc.text('MOMENTS AI  ·  FORENSIC INTEGRITY & CHEATING AUDIT REPORT', M, 13);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(148,163,184);
    doc.text(`SESSION: ${session.sessionId}  ·  GENERATED: ${new Date().toISOString().slice(0,19).replace('T',' ')} UTC`, M, 19);
    doc.text(`Page ${pg} of ${total}`, PW - M - 16, 19);
  };
  const ftr = () => {
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,116,139);
    doc.text('CONFIDENTIAL — Produced by Moments AI Client-Side Behavioral Engine. All analysis performed locally.', M, PH - 8);
  };

  // ══════════════════════════════════════════════════════════════
  //  PAGE 1
  // ══════════════════════════════════════════════════════════════
  hdr(1, 2);
  let y = 30;

  // Candidate card
  doc.setFillColor(248,250,252); doc.setDrawColor(226,232,240);
  doc.roundedRect(M, y, PW - M*2, 28, 3, 3, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(15,23,42);
  doc.text('CANDIDATE & EXAM DETAILS', M+5, y+7);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(51,65,85);
  const c1=M+5, c2=M+70, c3=M+130;
  doc.text(`Name: ${P.name}`,        c1, y+15); doc.text(`Exam: ${P.examTitle}`, c2, y+15); doc.text(`Duration: ${P.durationMins} min`, c3, y+15);
  doc.text(`Roll ID: ${P.rollId}`,   c1, y+22); doc.text(`Code: ${P.examCode}`,  c2, y+22); doc.text(`Status: ${session.status.toUpperCase()}`, c3, y+22);
  y += 34;

  // Verdict banner
  const isConf = CR.verdict === 'CONFIRMED', isSusp = CR.verdict === 'SUSPECTED';
  const [vBg, vBd, vTxt] = isConf
    ? [[254,242,242],[239,68,68],[185,28,28]]
    : isSusp
      ? [[255,251,235],[245,158,11],[180,83,9]]
      : [[240,253,244],[16,185,129],[4,120,87]];
  doc.setFillColor(vBg[0],vBg[1],vBg[2]); doc.setDrawColor(vBd[0],vBd[1],vBd[2]);
  doc.setLineWidth(1.2); doc.roundedRect(M, y, PW-M*2, 28, 3, 3, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(vTxt[0],vTxt[1],vTxt[2]);
  const verdictLabel = isConf ? '⚠  CONFIRMED CHEATING DETECTED' : isSusp ? '⚡  SUSPECTED CHEATING — REVIEW REQUIRED' : '✓  EXAM INTEGRITY CLEARED — NO CHEATING';
  doc.text(verdictLabel, M+6, y+10);
  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  doc.text(`Cheating Likelihood: ${CR.likelihoodPct}%   ·   Integrity Score: ${session.metrics.integrityScore}%`, M+6, y+18);
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(CR.verdictReason, PW-M*2-12);
  doc.text(lines, M+6, y+24);
  y += 34;

  // Summary stats row
  const stats = [
    { lbl:'Violations', val:`${session.violations.length}` },
    { lbl:'Tab Switches', val:`${session.metrics.tabSwitchCount}` },
    { lbl:'Corner Glances', val:`${session.metrics.cornerGlanceCount}` },
    { lbl:'Head Turns', val:`${session.metrics.headTurnCount}` },
  ];
  const sw = (PW-M*2-9) / 4;
  stats.forEach((s,i) => {
    const x = M + i*(sw+3);
    doc.setFillColor(248,250,252); doc.setDrawColor(203,213,225);
    doc.roundedRect(x, y, sw, 20, 2, 2, 'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(15,23,42);
    doc.text(s.val, x+5, y+9);
    doc.setFontSize(7); doc.setTextColor(71,85,105);
    doc.text(s.lbl, x+5, y+16);
  });
  y += 26;

  // Comparative benchmark table
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(15,23,42);
  doc.text('COMPARATIVE BEHAVIORAL BENCHMARK — CANDIDATE vs CLASS COHORT', M, y);
  y += 4;

  // Table header
  doc.setFillColor(15,23,42); doc.rect(M, y, PW-M*2, 7, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(255,255,255);
  doc.text('BEHAVIORAL METRIC', M+4, y+4.8);
  doc.text('CANDIDATE', M+78, y+4.8);
  doc.text('COHORT AVG', M+108, y+4.8);
  doc.text('STATUS', M+148, y+4.8);
  y += 7;

  CR.factors.forEach((f, i) => {
    doc.setFillColor(i%2===0 ? 255:248, i%2===0 ? 255:250, i%2===0 ? 255:252);
    doc.rect(M, y, PW-M*2, 8, 'F');
    doc.setDrawColor(226,232,240);
    doc.line(M, y+8, PW-M, y+8);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(30,41,59);
    doc.text(`${f.label}`, M+4, y+5.5);
    doc.text(`${f.candidateVal}${f.unit ? ' '+f.unit : ''}`, M+78, y+5.5);
    doc.text(`${f.cohortAvg}${f.unit ? ' '+f.unit : ''}`, M+108, y+5.5);
    doc.setFont('helvetica','bold');
    doc.setTextColor(f.status==='CRITICAL' ? 220:f.status==='ELEVATED' ? 217:5, f.status==='CRITICAL' ? 38:f.status==='ELEVATED' ? 119:150, f.status==='CRITICAL' ? 38:f.status==='ELEVATED' ? 6:105);
    doc.text(f.status, M+148, y+5.5);
    y += 8;
  });
  y += 6;

  // Primary Evidence
  if (CR.primaryEvidences.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(185,28,28);
    doc.text('PRIMARY EVIDENCE:', M, y);
    y += 4;
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(51,65,85);
    CR.primaryEvidences.forEach(e => {
      doc.text(`• ${e}`, M+4, y);
      y += 4.5;
    });
    y += 4;
  }

  // Violation log
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(15,23,42);
  doc.text('FLAGGED MOMENTS — CHRONOLOGICAL LOG', M, y);
  y += 4;

  if (session.violations.length === 0) {
    doc.setFont('helvetica','italic'); doc.setFontSize(8.5); doc.setTextColor(100,116,139);
    doc.text('No suspicious behavioral moments were logged during this exam session.', M+4, y+5);
  } else {
    session.violations.slice(0,5).forEach((v, i) => {
      doc.setFillColor(i%2===0?255:248,i%2===0?255:250,i%2===0?255:252);
      doc.rect(M, y, PW-M*2, 8, 'F');
      doc.setDrawColor(226,232,240); doc.line(M, y+8, PW-M, y+8);
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(30,41,59);
      doc.text(`T+${v.timeLabel}`, M+4, y+5.5);
      doc.setFont('helvetica','normal');
      doc.text(v.title, M+22, y+5.5);
      doc.setFont('helvetica','bold');
      doc.setTextColor(v.severity==='critical'||v.severity==='high'?220:217, v.severity==='critical'||v.severity==='high'?38:119, 38);
      doc.text(v.severity.toUpperCase(), M+115, y+5.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
      doc.text(`${Math.round(v.confidence*100)}%`, M+145, y+5.5);
      y += 8;
    });
  }

  // Examiner verdict sign-off
  const svY = PH - 40;
  doc.setFillColor(248,250,252); doc.setDrawColor(203,213,225);
  doc.roundedRect(M, svY, PW-M*2, 22, 2, 2, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(15,23,42);
  doc.text(`EXAMINER VERDICT: ${session.examinerVerdict ?? 'PENDING'}`, M+5, svY+8);
  if (session.examinerNote) {
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(51,65,85);
    doc.text(`Note: ${session.examinerNote}`, M+5, svY+15);
  }
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(148,163,184);
  doc.text(`Signature line: ______________ Date: ${new Date().toDateString()}`, PW-M-90, svY+18);

  ftr();

  // ══════════════════════════════════════════════════════════════
  //  PAGE 2 — Visual Evidence
  // ══════════════════════════════════════════════════════════════
  doc.addPage(); hdr(2, 2); y = 30;
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(15,23,42);
  doc.text('VISUAL EVIDENCE — SYNCHRONIZED WEBCAM & SCREEN SNAPSHOTS', M, y);
  y += 6;

  if (session.violations.length === 0) {
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text('No visual evidence required. Candidate session cleared all integrity checkpoints.', M, y+10);
  } else {
    for (const v of session.violations.slice(0, 3)) {
      const cardH = 66;
      doc.setFillColor(248,250,252); doc.setDrawColor(203,213,225);
      doc.roundedRect(M, y, PW-M*2, cardH, 3, 3, 'FD');
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(15,23,42);
      doc.text(`[${v.timeLabel}]  ${v.title}   (Conf: ${Math.round(v.confidence*100)}%)`, M+4, y+6);

      const iW=70, iH=42, iY=y+10;
      try {
        if (v.webcamSnap) doc.addImage(v.webcamSnap, 'JPEG', M+4, iY, iW, iH);
      } catch {
        doc.rect(M+4, iY, iW, iH);
        doc.setFontSize(7); doc.text('Snapshot N/A', M+8, iY+18);
      }
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(71,85,105);
      const mx = M+4+iW+8;
      doc.text(doc.splitTextToSize(v.description, PW-mx-M-4), mx, y+16);
      doc.text(`• Zone: ${v.gazeZone ?? 'N/A'}`, mx, y+36);
      if (v.headPose) doc.text(`• Head Pose: Yaw ${v.headPose.yaw}°  Pitch ${v.headPose.pitch}°`, mx, y+41);
      if (v.examinerNote) {
        doc.setFont('helvetica','bold'); doc.setTextColor(99,102,241);
        doc.text(`Examiner: ${v.examinerNote}`, mx, y+50);
      }
      y += cardH + 6;
    }
  }

  // Signature seal
  doc.setDrawColor(148,163,184);
  doc.line(PW-M-58, PH-36, PW-M, PH-36);
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(15,23,42);
  doc.text('Certified Examiner Signature', PW-M-58, PH-31);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(100,116,139);
  doc.text(`Verify: SHA256-${session.sessionId.slice(0,14)}`, PW-M-58, PH-27);

  ftr();

  doc.save(`MomentsAI_Report_${P.name.replace(/\s+/g,'_')}_${session.sessionId}.pdf`);
}
