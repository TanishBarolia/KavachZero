import { ScanResult } from '@/types/security';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY: number };
}

/**
 * Generates an institutional KavachZero Security Forensics & Compliance Report PDF
 */
export async function exportForensicsPDF(result: ScanResult): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as AutoTableDoc;

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Background Header / Banner
  doc.setFillColor(6, 9, 19); // #060913 deep obsidian
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('KAVACHZERO // SECURITY FORENSICS REPORT', 14, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Unified Zero-Knowledge Security Command Center | Tamper-Evident Ledger', 14, y + 12);

  // Meta row on header
  doc.setFontSize(8);
  const tsFormatted = result.timestamp ? new Date(result.timestamp).toUTCString() : new Date().toUTCString();
  doc.text(`DATE: ${tsFormatted}`, pageWidth - 14, y + 5, { align: 'right' });
  doc.text(`MODULE: ${result.module || 'UNKNOWN'}`, pageWidth - 14, y + 12, { align: 'right' });

  y = 45;

  // Executive Verdict Box
  const verdictColor: [number, number, number] = 
    result.verdict === 'GO' ? [16, 185, 129] :
    result.verdict === 'REVIEW' ? [245, 158, 11] : [239, 68, 68];

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.setLineWidth(1);
  doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EXECUTIVE THREAT VERDICT:', 20, y + 10);

  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.setFontSize(16);
  doc.text(result.verdict || 'PENDING', 85, y + 11);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`UNIFIED RISK SCORE: ${result.riskScore ?? 0} / 100`, 20, y + 20);
  doc.text(`MODEL CONFIDENCE: ${result.confidence ?? 100}%`, 85, y + 20);
  doc.text(`FLAGS TRIGGERED: ${result.flags?.length || 0}`, 150, y + 20);

  y += 36;

  // Cryptographic Ledger Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CRYPTOGRAPHIC AUDIT CHAIN VERIFICATION', 14, y);
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const prevH = result.prevHash || 'GENESIS_0000000000000000';
  const recH = result.recordHash || 'COMPUTING_OR_LOCAL_TRANSIENT';
  doc.text(`PREV_HASH:   ${prevH}`, 14, y);
  y += 4.5;
  doc.text(`RECORD_HASH: ${recH}`, 14, y);
  y += 8;

  // Triggered Flags Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('TRIGGERED RISK INDICATORS & FORENSICS', 14, y);
  y += 2;

  const flagRows = (result.flags || []).map((f) => [
    f.code || 'UNKNOWN',
    f.severity || 'INFO',
    f.label || 'Indicator',
    f.details || 'No additional details provided.',
  ]);

  // Execute autoTable directly using the imported autoTable function
  autoTable(doc, {
    startY: y,
    head: [['CODE', 'SEVERITY', 'INDICATOR', 'TECHNICAL FORENSICS DETAILS']],
    body: flagRows.length > 0 ? flagRows : [['NONE', 'INFO', 'Clean Baseline', 'No suspicious risk markers or malicious anomalies identified.']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 32, font: 'courier' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 'auto' },
    },
  });

  y = (doc.lastAutoTable?.finalY ?? y + 30) + 10;

  // Sanitized Telemetry Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('SANITIZED TELEMETRY METRICS (ZERO-KNOWLEDGE)', 14, y);
  y += 2;

  const telemetryRows = Object.entries(result.metadata || {}).map(([k, v]) => [
    k,
    String(v),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['TELEMETRY KEY', 'SANITIZED VALUE / ATTRIBUTE']],
    body: telemetryRows.length > 0 ? telemetryRows : [['status', 'No additional metadata logged']],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 60, font: 'courier' },
      1: { cellWidth: 'auto', font: 'courier' },
    },
  });

  y = (doc.lastAutoTable?.finalY ?? y + 25) + 12;

  // Privacy Attestation Callout
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ZERO-KNOWLEDGE PRIVACY ATTESTATION', 20, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'KavachZero certifies that raw biometric video frames, user ID photos, and PII strings are evaluated solely in client-side secure memory. Only deterministic telemetry summaries, risk verdicts, and cryptographic SHA-256 hashes are persisted.',
    20,
    y + 13,
    { maxWidth: pageWidth - 42 }
  );

  // Save PDF
  const filename = `KavachZero_Forensics_${result.module || 'SCAN'}_${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Exports scan result to structured JSON file
 */
export function exportForensicsJSON(result: ScanResult): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `KavachZero_Forensics_${result.module || 'SCAN'}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
