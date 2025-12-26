import type { Document, BusinessProfile } from '@/types/business';
import { getDocumentTemplate, generateDocumentContent } from '@/lib/document-templates';

export interface PDFOptions {
  includeLogo?: boolean;
  includeQRCode?: boolean;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export async function generatePDF(
  document: Document,
  business: BusinessProfile,
  options: PDFOptions = {}
): Promise<string> {
  // Get template for document
  const template = getDocumentTemplate(document.type, business.type);
  
  // For now, return formatted text content
  // In production, use expo-print or react-native-pdf to generate actual PDF
  // This is a placeholder that formats the content for PDF generation
  
  const formatCurrency = (amount: number) => {
    const symbol = document.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Generate HTML for PDF (can be converted to PDF using expo-print)
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${template.styling.primaryColor};
        }
        .business-name {
          font-size: 28px;
          font-weight: bold;
          color: ${template.styling.primaryColor};
          margin-bottom: 10px;
        }
        .document-type {
          font-size: 20px;
          color: #666;
          margin-bottom: 10px;
        }
        .document-number {
          font-size: 16px;
          color: #999;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .from-to {
          flex: 1;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: ${template.styling.primaryColor};
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .items-table th {
          background-color: ${template.styling.primaryColor};
          color: white;
          padding: 12px;
          text-align: left;
        }
        .items-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }
        .totals {
          text-align: right;
          margin-top: 20px;
        }
        .total-row {
          margin-bottom: 10px;
        }
        .total-label {
          display: inline-block;
          width: 150px;
          font-weight: bold;
        }
        .total-value {
          display: inline-block;
          width: 150px;
          text-align: right;
        }
        .grand-total {
          font-size: 24px;
          font-weight: bold;
          color: ${template.styling.primaryColor};
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid ${template.styling.primaryColor};
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${business.name}</div>
        <div class="document-type">${document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ')}</div>
        <div class="document-number">${document.documentNumber}</div>
      </div>
      
      <div class="info-section">
        <div class="from-to">
          <div class="section-title">From:</div>
          <div>${business.name}</div>
          ${business.phone ? `<div>${business.phone}</div>` : ''}
          ${business.location ? `<div>${business.location}</div>` : ''}
          ${business.email ? `<div>${business.email}</div>` : ''}
        </div>
        <div class="from-to">
          <div class="section-title">To:</div>
          <div>${document.customerName}</div>
          ${document.customerPhone ? `<div>${document.customerPhone}</div>` : ''}
          ${document.customerEmail ? `<div>${document.customerEmail}</div>` : ''}
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${document.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unitPrice)}</td>
              <td>${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span class="total-value">${formatCurrency(document.subtotal)}</span>
        </div>
        ${document.tax ? `
          <div class="total-row">
            <span class="total-label">Tax:</span>
            <span class="total-value">${formatCurrency(document.tax)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span class="total-label">Total:</span>
          <span class="total-value">${formatCurrency(document.total)}</span>
        </div>
      </div>
      
      ${document.dueDate ? `
        <div style="margin-top: 30px; text-align: center; color: #666;">
          <strong>Due Date:</strong> ${formatDate(document.dueDate)}
        </div>
      ` : ''}
      
      ${document.notes ? `
        <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid ${template.styling.primaryColor};">
          <strong>Notes:</strong><br>
          ${document.notes}
        </div>
      ` : ''}
      
      <div class="footer">
        Generated by DreamBig Business OS<br>
        Thank you for your business!
      </div>
    </body>
    </html>
  `;

  return html;
}

// Export as PDF using expo-print (requires expo-print package)
export async function exportToPDF(
  document: Document,
  business: BusinessProfile,
  options: PDFOptions = {}
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    
    const html = await generatePDF(document, business, options);
    
    const { uri } = await (Print as any).printToFileAsync({
      html,
      base64: false,
    });
    
    if ((Sharing as any).isAvailableAsync && await (Sharing as any).isAvailableAsync()) {
      await (Sharing as any).shareAsync(uri);
    }
  } catch (error) {
    console.warn('PDF export not available, using text format', error);
    const content = generateDocumentContent(document, business, getDocumentTemplate(document.type, business.type));
    const { Share } = await import('react-native');
    await Share.share({
      message: content,
      title: `${document.documentNumber}`,
    });
  }
}

