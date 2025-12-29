import type { Document, BusinessProfile } from '@/types/business';
import { getDocumentTemplate } from '@/lib/document-templates-db';
import { generateDocumentContent } from '@/lib/document-templates';

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
  const template = await getDocumentTemplate(document.type, business.type);
  
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
  const logoHtml = business.logo 
    ? `<img src="${business.logo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 20px;" />`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 50px;
          color: #1a1a1a;
          background: #ffffff;
          line-height: 1.6;
        }
        .document-container {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          box-shadow: 0 0 30px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${template.styling.primaryColor} 0%, ${template.styling.secondaryColor || template.styling.primaryColor} 100%);
          color: white;
          padding: 40px;
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .logo-section {
          flex: 1;
        }
        .logo-section img {
          max-height: 70px;
          max-width: 180px;
          margin-bottom: 20px;
          background: white;
          padding: 10px;
          border-radius: 8px;
        }
        .business-info {
          flex: 1;
          text-align: right;
        }
        .business-name {
          font-size: 32px;
          font-weight: 800;
          color: white;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .document-type {
          font-size: 24px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .document-number {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          font-weight: 500;
        }
        .content-section {
          padding: 40px;
          background: #ffffff;
        }
        .info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 40px;
        }
        .from-to {
          flex: 1;
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          border-left: 4px solid ${template.styling.primaryColor};
        }
        .section-title {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 12px;
          color: ${template.styling.primaryColor};
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .section-content {
          font-size: 15px;
          color: #333;
          line-height: 1.8;
        }
        .section-content div {
          margin-bottom: 6px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .items-table thead {
          background: linear-gradient(135deg, ${template.styling.primaryColor} 0%, ${template.styling.secondaryColor || template.styling.primaryColor} 100%);
          color: white;
        }
        .items-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .items-table tbody tr:hover {
          background: #f8f9fa;
        }
        .items-table tbody tr:last-child {
          border-bottom: none;
        }
        .items-table td {
          padding: 16px;
          font-size: 15px;
          color: #333;
        }
        .items-table td:last-child {
          font-weight: 600;
          color: ${template.styling.primaryColor};
        }
        .totals {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          margin-top: 30px;
        }
        .totals-inner {
          max-width: 400px;
          margin-left: auto;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        .total-row:last-child {
          border-bottom: none;
        }
        .total-label {
          font-size: 15px;
          font-weight: 500;
          color: #666;
        }
        .total-value {
          font-size: 15px;
          font-weight: 600;
          color: #333;
        }
        .grand-total {
          font-size: 28px;
          font-weight: 800;
          color: ${template.styling.primaryColor};
          margin-top: 8px;
          padding-top: 16px;
          border-top: 3px solid ${template.styling.primaryColor};
        }
        .grand-total .total-label {
          font-size: 20px;
          color: ${template.styling.primaryColor};
        }
        .grand-total .total-value {
          font-size: 28px;
          color: ${template.styling.primaryColor};
        }
        .notes-section {
          background: #fff9e6;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
        }
        .notes-title {
          font-weight: 700;
          color: #f59e0b;
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .notes-content {
          color: #333;
          line-height: 1.8;
        }
        .due-date-section {
          background: ${template.styling.primaryColor}15;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
          text-align: center;
        }
        .due-date-label {
          font-size: 13px;
          font-weight: 600;
          color: ${template.styling.primaryColor};
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .due-date-value {
          font-size: 20px;
          font-weight: 700;
          color: ${template.styling.primaryColor};
        }
        .footer {
          margin-top: 50px;
          padding-top: 30px;
          border-top: 2px solid #f0f0f0;
          text-align: center;
          color: #999;
          font-size: 12px;
          background: #fafafa;
          padding: 30px;
          border-radius: 0 0 12px 12px;
        }
        .footer-text {
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="document-container">
        <div class="header">
          <div class="header-content">
            <div class="logo-section">
              ${logoHtml}
            </div>
            <div class="business-info">
              ${!business.logo ? `<div class="business-name">${business.name}</div>` : ''}
              <div class="document-type">${document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ')}</div>
              <div class="document-number">${document.documentNumber}</div>
            </div>
          </div>
        </div>
        
        <div class="content-section">
          <div class="info-section">
            <div class="from-to">
              <div class="section-title">From</div>
              <div class="section-content">
                <div><strong>${business.name}</strong></div>
                ${business.phone ? `<div>📞 ${business.phone}</div>` : ''}
                ${business.location ? `<div>📍 ${business.location}</div>` : ''}
                ${business.email ? `<div>✉️ ${business.email}</div>` : ''}
                ${business.address ? `<div>${business.address}</div>` : ''}
              </div>
            </div>
            <div class="from-to">
              <div class="section-title">${document.type === 'purchase_order' || document.type === 'supplier_agreement' ? 'Supplier' : 'Bill To'}</div>
              <div class="section-content">
                <div><strong>${document.customerName}</strong></div>
                ${document.customerPhone ? `<div>📞 ${document.customerPhone}</div>` : ''}
                ${document.customerEmail ? `<div>✉️ ${document.customerEmail}</div>` : ''}
              </div>
            </div>
          </div>
      
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${document.items.map(item => `
                <tr>
                  <td><strong>${item.description}</strong></td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-inner">
              <div class="total-row">
                <span class="total-label">Subtotal</span>
                <span class="total-value">${formatCurrency(document.subtotal)}</span>
              </div>
              ${document.tax ? `
                <div class="total-row">
                  <span class="total-label">Tax</span>
                  <span class="total-value">${formatCurrency(document.tax)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span class="total-label">Total</span>
                <span class="total-value">${formatCurrency(document.total)}</span>
              </div>
            </div>
          </div>
          
          ${document.dueDate ? `
            <div class="due-date-section">
              <div class="due-date-label">Payment Due Date</div>
              <div class="due-date-value">${formatDate(document.dueDate)}</div>
            </div>
          ` : ''}
          
          ${document.notes ? `
            <div class="notes-section">
              <div class="notes-title">Notes & Terms</div>
              <div class="notes-content">${document.notes}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-text"><strong>Generated by DreamBig Business OS</strong></div>
          <div class="footer-text">Thank you for your business! 🙏</div>
          <div class="footer-text" style="margin-top: 8px; font-size: 11px; color: #bbb;">
            Document Date: ${formatDate(document.date)}
          </div>
        </div>
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

