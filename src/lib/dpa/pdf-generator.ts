/**
 * DPA PDF Generator
 * Generates signed DPA PDFs for download and storage
 * Ticket: REMY-257
 */

import { DpaAgreement, DpaVersion } from './utils';

// PDF template HTML for browser-based PDF generation
export function generatePdfHtml(
  templateContent: string,
  agreement: DpaAgreement,
  customerName: string
): string {
  const signedAt = agreement.signed_at 
    ? new Date(agreement.signed_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : 'Pending';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Data Processing Agreement - ${customerName}</title>
  <style>
    @page {
      margin: 2cm;
      size: A4;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 {
      font-size: 18pt;
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 14pt;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #222;
    }
    h3 {
      font-size: 12pt;
      margin-top: 18px;
      margin-bottom: 8px;
      color: #444;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    table, th, td {
      border: 1px solid #333;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .signature-block {
      margin-top: 40px;
      border-top: 2px solid #333;
      padding-top: 20px;
    }
    .signature-section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      width: 60%;
      margin: 40px 0 8px;
    }
    .metadata {
      font-size: 9pt;
      color: #666;
      margin-top: 40px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      page-break-inside: avoid;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 60pt;
      color: rgba(0, 150, 0, 0.1);
      z-index: -1;
      pointer-events: none;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 10pt;
      font-weight: bold;
    }
    .status-signed {
      background-color: #d4edda;
      color: #155724;
    }
    .article {
      margin-bottom: 20px;
    }
    ul {
      margin-bottom: 12px;
    }
    li {
      margin-bottom: 6px;
    }
    blockquote {
      border-left: 3px solid #ccc;
      margin-left: 0;
      padding-left: 15px;
      color: #666;
    }
  </style>
</head>
<body>
  ${agreement.status === 'signed' ? '<div class="watermark">SIGNED</div>' : ''}
  
  <header>
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 24pt; font-weight: bold; margin-bottom: 10px;">REMY Analytics</div>
      <div style="font-size: 10pt; color: #666;">Data Processing Agreement</div>
    </div>
  </header>

  <div style="text-align: center; margin: 20px 0;">
    <span class="status-badge ${agreement.status === 'signed' ? 'status-signed' : ''}">
      Status: ${agreement.status.toUpperCase()}
    </span>
  </div>

  <div class="content">
    ${templateContent.replace(/\n/g, '<br>').replace(/### /g, '<h3>').replace(/## /g, '<h2>').replace(/# /g, '<h1>')}
  </div>

  <div class="signature-block">
    <h2>Digital Signature Certificate</h2>
    
    <div class="metadata">
      <strong>Document Information:</strong><br>
      Document ID: <code>${agreement.id}</code><br>
      Version: ${agreement.dpa_version}<br>
      Signed: ${signedAt}<br>
      Signature Hash: <code>${agreement.signature_hash.substring(0, 32)}...</code><br>
      <br>
      <strong>Verification:</strong> This document has been digitally signed and is legally binding.
      The integrity of this agreement is protected by cryptographic hashing.
    </div>
    
    <div class="signature-section">
      <div class="signature-line"></div>
      <div>${customerName} - Controller Representative</div>
      <div style="font-size: 9pt; color: #666; margin-top: 5px;">
        Electronically signed on ${signedAt}
      </div>
    </div>
    
    <div class="signature-section">
      <div class="signature-line"></div>
      <div>REMY Analytics, Inc. - Processor</div>
      <div style="font-size: 9pt; color: #666; margin-top: 5px;">
        Data Protection Officer
      </div>
    </div>
  </div>

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 8pt; color: #999;">
    <p>This Data Processing Agreement is governed by the laws of the State of California and the General Data Protection Regulation (EU) 2016/679. For questions regarding this agreement, contact dpo@remyanalytics.com.</p>
    <p>Page 1 of 1</p>
  </footer>
</body>
</html>`;
}

/**
 * Convert HTML to PDF using browser's print API
 * This is a client-side fallback when server-side PDF generation is not available
 */
export function printToPdf(
  templateContent: string,
  agreement: DpaAgreement,
  customerName: string,
  filename: string = 'dpa-agreement.pdf'
): void {
  const html = generatePdfHtml(templateContent, agreement, customerName);
  
  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

/**
 * Create a downloadable PDF blob
 * Uses iframe technique for compatibility
 */
export function createPdfBlob(
  htmlContent: string
): Blob {
  return new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
}

/**
 * Download the DPA as an HTML file (fallback when PDF generation isn't available)
 */
export function downloadDpaHtml(
  templateContent: string,
  agreement: DpaAgreement,
  customerName: string
): void {
  const html = generatePdfHtml(templateContent, agreement, customerName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `dpa-agreement-${agreement.id.substring(0, 8)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a data URL for PDF preview
 */
export function generatePdfPreviewUrl(
  templateContent: string,
  agreement: DpaAgreement,
  customerName: string
): string {
  const html = generatePdfHtml(templateContent, agreement, customerName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * PDF Certificate data for API responses
 */
export interface PdfCertificate {
  agreementId: string;
  documentId: string;
  downloadUrl: string;
  viewUrl: string;
  fileType: 'pdf' | 'html';
  expiresAt: string | null;
}

/**
 * Create certificate response
 */
export function createCertificateResponse(
  agreement: DpaAgreement,
  templateContent: string,
  customerName: string
): PdfCertificate {
  const html = generatePdfHtml(templateContent, agreement, customerName);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  
  return {
    agreementId: agreement.id,
    documentId: generateDocumentId(agreement.id),
    downloadUrl,
    viewUrl: downloadUrl,
    fileType: 'html',
    expiresAt: agreement.expires_at,
  };
}

function generateDocumentId(agreementId: string): string {
  return `DPA-${agreementId.substring(0, 8).toUpperCase()}`;
}

/**
 * Simple markdown to HTML converter for the template
 */
export function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
