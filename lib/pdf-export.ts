import type { Document, BusinessProfile } from '@/types/business';
import { getDocumentTemplate } from '@/lib/document-templates-db';
import { generateDocumentContent } from '@/lib/document-templates';
import { Platform } from 'react-native';

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle logo - convert base64 or use URL directly
  let logoHtml = '';
  if (business.logo) {
    // If it's already a URL (http/https), use it directly
    if (business.logo.startsWith('http://') || business.logo.startsWith('https://')) {
      logoHtml = `<img src="${business.logo}" alt="${business.name} Logo" style="max-height: 90px; max-width: 220px; object-fit: contain; display: block;" />`;
    } 
    // If it's base64, use it directly
    else if (business.logo.startsWith('data:image')) {
      logoHtml = `<img src="${business.logo}" alt="${business.name} Logo" style="max-height: 90px; max-width: 220px; object-fit: contain; display: block;" />`;
    }
    // Otherwise, assume it's a base64 string without prefix
    else {
      logoHtml = `<img src="data:image/png;base64,${business.logo}" alt="${business.name} Logo" style="max-height: 90px; max-width: 220px; object-fit: contain; display: block;" />`;
    }
  }

  // Build company details section
  const companyDetails = [];
  if (business.name) companyDetails.push(`<div><strong>${business.name}</strong></div>`);
  if (business.owner) companyDetails.push(`<div style="color: rgba(255,255,255,0.9); font-size: 13px;">Owner: ${business.owner}</div>`);
  if (business.address) companyDetails.push(`<div>${business.address}</div>`);
  if (business.location) companyDetails.push(`<div>${business.location}, Zimbabwe</div>`);
  if (business.phone) companyDetails.push(`<div>📞 ${business.phone}</div>`);
  if (business.email) companyDetails.push(`<div>✉️ ${business.email}</div>`);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          padding: 40px 20px;
          color: #1a1a1a;
          background: #f5f7fa;
          line-height: 1.6;
        }
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 50px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, ${template.styling.primaryColor} 0%, ${template.styling.secondaryColor || template.styling.primaryColor} 100%);
          color: white;
          padding: 40px;
          border-radius: 12px 12px 0 0;
          margin-bottom: 0;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        .logo-section {
          flex: 1;
        }
        .logo-section img {
          max-height: 90px;
          max-width: 220px;
          background: white;
          padding: 12px;
          border-radius: 8px;
          object-fit: contain;
        }
        .document-meta {
          flex: 1;
          text-align: right;
        }
        .document-type {
          font-size: 28px;
          font-weight: 800;
          color: white;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .document-number {
          font-size: 16px;
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .document-date {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          font-weight: 500;
        }
        .company-info-section {
          background: rgba(255,255,255,0.15);
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .company-name {
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin-bottom: 12px;
        }
        .company-details {
          font-size: 14px;
          color: rgba(255,255,255,0.95);
          line-height: 1.8;
        }
        .company-details div {
          margin-bottom: 4px;
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
          font-size: 13px;
          margin-bottom: 12px;
          color: ${template.styling.primaryColor};
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .section-content {
          font-size: 15px;
          color: #334155;
          line-height: 1.8;
        }
        .section-content div {
          margin-bottom: 8px;
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
          font-weight: 700;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
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
          color: #334155;
        }
        .items-table td:last-child {
          font-weight: 700;
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
          color: #64748B;
        }
        .total-value {
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
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
          color: #334155;
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
        .payment-section {
          background: #f0f9ff;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
          border-left: 4px solid ${template.styling.primaryColor};
        }
        .payment-title {
          font-weight: 700;
          color: ${template.styling.primaryColor};
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .payment-content {
          color: #334155;
          line-height: 1.8;
        }
        .status-section {
          padding: 16px;
          border-radius: 8px;
          margin-top: 20px;
          text-align: center;
          border-left: 4px solid;
        }
        .status-text {
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 30px;
          border-top: 3px solid #e2e8f0;
          text-align: center;
          color: #64748B;
          font-size: 12px;
          background: #fafafa;
          padding: 30px;
          border-radius: 0 0 12px 12px;
        }
        .footer-company {
          font-weight: 700;
          color: #1e293b;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .footer-details {
          color: #64748B;
          line-height: 1.8;
          margin-bottom: 12px;
        }
        .footer-details div {
          margin-bottom: 4px;
        }
        .footer-text {
          margin-bottom: 6px;
          color: #94a3b8;
        }
        .footer-generated {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 11px;
          color: #cbd5e1;
        }
        @media print {
          body {
            padding: 0;
            background: white;
          }
          .page {
            box-shadow: none;
            padding: 30px;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-top">
            <div class="logo-section">
              ${logoHtml || `<div style="font-size: 36px; font-weight: 800; color: white; padding: 20px;">${business.name.charAt(0).toUpperCase()}</div>`}
            </div>
            <div class="document-meta">
              <div class="document-type">${document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ')}</div>
              <div class="document-number">#${document.documentNumber}</div>
              <div class="document-date">Date: ${formatDate(document.date)}</div>
            </div>
          </div>
          <div class="company-info-section">
            <div class="company-name">${business.name}</div>
            <div class="company-details">
              ${companyDetails.join('')}
            </div>
          </div>
        </div>
        
        <div class="content-section">
          <div class="info-section">
            <div class="from-to">
              <div class="section-title">From</div>
              <div class="section-content">
                <div><strong>${business.name}</strong></div>
                ${business.owner ? `<div style="color: #64748B; font-size: 13px;">Owner: ${business.owner}</div>` : ''}
                ${business.address ? `<div>${business.address}</div>` : ''}
                ${business.location ? `<div>${business.location}, Zimbabwe</div>` : ''}
                ${business.phone ? `<div>📞 ${business.phone}</div>` : ''}
                ${business.email ? `<div>✉️ ${business.email}</div>` : ''}
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
              ${(document as any).discountAmount ? `
                <div class="total-row" style="color: #10B981;">
                  <span class="total-label">Discount</span>
                  <span class="total-value">-${formatCurrency((document as any).discountAmount)}</span>
                </div>
              ` : ''}
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
              ${(document as any).amountReceived ? `
                <div class="total-row" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e0e0e0;">
                  <span class="total-label">Amount Received</span>
                  <span class="total-value">${formatCurrency((document as any).amountReceived)}</span>
                </div>
                ${(document as any).changeAmount > 0 ? `
                  <div class="total-row" style="color: #10B981;">
                    <span class="total-label">Change</span>
                    <span class="total-value">${formatCurrency((document as any).changeAmount)}</span>
                  </div>
                ` : ''}
              ` : ''}
              ${document.paidAmount && document.paidAmount < document.total ? `
                <div class="total-row" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e0e0e0;">
                  <span class="total-label">Paid Amount</span>
                  <span class="total-value">${formatCurrency(document.paidAmount)}</span>
                </div>
                <div class="total-row" style="color: #F59E0B;">
                  <span class="total-label">Balance Due</span>
                  <span class="total-value">${formatCurrency(document.total - document.paidAmount)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${document.paymentMethod ? `
            <div class="payment-section">
              <div class="payment-title">Payment Information</div>
              <div class="payment-content">
                <div><strong>Payment Method:</strong> ${document.paymentMethod.replace('_', ' ').toUpperCase()}</div>
                ${document.paymentMethod === 'card' || document.paymentMethod === 'bank_transfer' || document.paymentMethod === 'mobile_money' ? `
                  <div style="margin-top: 8px; font-size: 13px; color: #64748B;">
                    ${document.status === 'paid' ? '✓ Payment Completed' : 'Payment Pending'}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
          
          ${document.status ? `
            <div class="status-section" style="background: ${document.status === 'paid' ? '#10B98115' : document.status === 'cancelled' ? '#EF444415' : '#F59E0B15'}; border-left-color: ${document.status === 'paid' ? '#10B981' : document.status === 'cancelled' ? '#EF4444' : '#F59E0B'};">
              <div class="status-text" style="color: ${document.status === 'paid' ? '#10B981' : document.status === 'cancelled' ? '#EF4444' : '#F59E0B'};">
                Status: ${document.status.toUpperCase()}
              </div>
            </div>
          ` : ''}
          
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
          <div class="footer-company">${business.name}</div>
          <div class="footer-details">
            ${business.address ? `<div>${business.address}</div>` : ''}
            ${business.location ? `<div>${business.location}, Zimbabwe</div>` : ''}
            ${business.phone ? `<div>Phone: ${business.phone}</div>` : ''}
            ${business.email ? `<div>Email: ${business.email}</div>` : ''}
            ${business.owner ? `<div>Owner: ${business.owner}</div>` : ''}
          </div>
          <div class="footer-text">Thank you for your business! 🙏</div>
          ${document.employeeName ? `
            <div class="footer-text" style="margin-top: 8px; font-size: 13px; color: #64748B;">
              Served by: <strong>${document.employeeName}</strong>
            </div>
          ` : ''}
          <div class="footer-generated">
            <div>Document #${document.documentNumber} | Date: ${formatDate(document.date)}</div>
            <div style="margin-top: 4px;">Generated by DreamBig Business OS</div>
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
  document: Document | any, // Allow extended document with additional fields
  business: BusinessProfile,
  options: PDFOptions = {}
): Promise<void> {
  try {
    // Check if expo-print is available
    let Print: any;
    try {
      Print = await import('expo-print');
      if (!Print || !Print.printToFileAsync) {
        throw new Error('expo-print module not properly loaded');
      }
    } catch (importError: any) {
      console.error('Failed to import expo-print:', importError);
      throw new Error('expo-print is not installed or not available. Please install it using: npm install expo-print');
    }

    const Sharing = await import('expo-sharing');
    
    const html = await generatePDF(document, business, options);
    
    // Validate HTML before attempting to generate PDF
    if (!html || html.trim().length === 0) {
      throw new Error('Failed to generate PDF content');
    }

    console.log('Generating PDF with HTML length:', html.length);
    
    // For web, use browser-specific approach (expo-print doesn't work well on web)
    if (Platform.OS === 'web') {
      try {
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc || !doc.body) {
          throw new Error('Document not available');
        }

        // Method 1: Try browser print dialog
        try {
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow && printWindow.document) {
            printWindow.document.write(html);
            printWindow.document.close();
            // Wait a bit for content to load, then print
            setTimeout(() => {
              printWindow.print();
            }, 250);
            return;
          }
        } catch (printError: any) {
          console.log('Print window failed, trying download:', printError);
        }

        // Method 2: Create downloadable HTML file
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = doc.createElement('a');
        if (link) {
          link.href = url;
          link.download = `${document.documentNumber || 'document'}.html`;
          link.style.display = 'none';
          
          // Safely append to body
          if (doc.body) {
            doc.body.appendChild(link);
            link.click();
            // Clean up
            setTimeout(() => {
              if (doc.body && link.parentNode) {
                doc.body.removeChild(link);
              }
              URL.revokeObjectURL(url);
            }, 100);
          } else {
            link.click();
            URL.revokeObjectURL(url);
          }
          
          const { Alert } = await import('react-native');
          Alert.alert(
            'Document Exported',
            'HTML document downloaded. You can open it in your browser and use "Print to PDF" to save as PDF.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (webError: any) {
        console.error('Web export failed:', webError);
        // Fall through to try expo-print as last resort
      }
    }
    
    // For native platforms, use expo-print
    let result: any;

    // For native platforms, try expo-print
    if (Platform.OS !== 'web') {
      // Try with base64 encoding first
      try {
        result = await Print.printToFileAsync({
          html,
          base64: false,
          width: 612, // A4 width in points
          height: 792, // A4 height in points
        });
        console.log('PDF generation result:', result);
      } catch (base64Error: any) {
        console.log('Base64 false failed, trying with base64 true:', base64Error);
        // Try with base64 encoding
        try {
          result = await Print.printToFileAsync({
            html,
            base64: true,
            width: 612,
            height: 792,
          });
          console.log('PDF generation with base64 result:', result);
          
          // If base64 is returned, convert to blob
          if (result && result.base64) {
            const { FileSystem } = await import('expo-file-system');
            const base64Data = result.base64;
            const filename = `${FileSystem.documentDirectory}${document.documentNumber || 'document'}.pdf`;
            
            await FileSystem.writeAsStringAsync(filename, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            result = { uri: filename };
          }
        } catch (base64TrueError: any) {
          console.error('Both PDF generation methods failed:', base64TrueError);
          throw base64TrueError;
        }
      }
      
      // Check if result exists and has uri property
      if (!result) {
        throw new Error('PDF generation failed: No result returned from printToFileAsync');
      }
      
      if (!result.uri && !result.base64) {
        console.error('PDF generation result:', result);
        throw new Error('PDF generation failed: No file URI or base64 data returned from printToFileAsync');
      }
      
      const uri = result.uri;
      
      if (!uri) {
        throw new Error('PDF generation failed: URI is null or undefined');
      }

      console.log('PDF generated successfully at:', uri);
    
      // Share the PDF (only for native platforms)
      try {
        if ((Sharing as any).isAvailableAsync && await (Sharing as any).isAvailableAsync()) {
          await (Sharing as any).shareAsync(uri);
        } else {
          const { Alert } = await import('react-native');
          Alert.alert('PDF Generated', `PDF saved to: ${uri}`);
        }
      } catch (shareError: any) {
        console.error('Sharing failed:', shareError);
        const { Alert } = await import('react-native');
        Alert.alert('PDF Generated', `PDF saved to: ${uri}. You can find it in your device's file system.`);
      }
    } else {
      // This shouldn't happen if web handling worked, but just in case
      throw new Error('PDF export not supported on web platform. Please use a native device.');
    }
  } catch (error: any) {
    console.error('PDF export error:', error);
    console.error('Error stack:', error.stack);
    
    // Create a simple text fallback without using generateDocumentContent
    try {
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

      // Build simple text content
      let textContent = `${business.name}\n`;
      textContent += `${document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ')} #${document.documentNumber}\n`;
      textContent += `Date: ${formatDate(document.date)}\n\n`;
      
      textContent += `From:\n${business.name}\n`;
      if (business.address) textContent += `${business.address}\n`;
      if (business.location) textContent += `${business.location}, Zimbabwe\n`;
      if (business.phone) textContent += `Phone: ${business.phone}\n`;
      if (business.email) textContent += `Email: ${business.email}\n\n`;
      
      textContent += `Bill To:\n${document.customerName}\n`;
      if (document.customerPhone) textContent += `Phone: ${document.customerPhone}\n`;
      if (document.customerEmail) textContent += `Email: ${document.customerEmail}\n\n`;
      
      textContent += `Items:\n`;
      document.items.forEach((item, index) => {
        textContent += `${index + 1}. ${item.description} - Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}\n`;
      });
      
      textContent += `\nSubtotal: ${formatCurrency(document.subtotal)}\n`;
      if ((document as any).discountAmount) {
        textContent += `Discount: -${formatCurrency((document as any).discountAmount)}\n`;
      }
      if (document.tax) {
        textContent += `Tax: ${formatCurrency(document.tax)}\n`;
      }
      textContent += `Total: ${formatCurrency(document.total)}\n`;
      
      if ((document as any).amountReceived) {
        textContent += `Amount Received: ${formatCurrency((document as any).amountReceived)}\n`;
        if ((document as any).changeAmount > 0) {
          textContent += `Change: ${formatCurrency((document as any).changeAmount)}\n`;
        }
      }
      
      if (document.paidAmount && document.paidAmount < document.total) {
        textContent += `Paid: ${formatCurrency(document.paidAmount)}\n`;
        textContent += `Balance Due: ${formatCurrency(document.total - document.paidAmount)}\n`;
      }
      
      if (document.dueDate) {
        textContent += `\nDue Date: ${formatDate(document.dueDate)}\n`;
      }
      
      if (document.notes) {
        textContent += `\nNotes: ${document.notes}\n`;
      }
      
      textContent += `\nThank you for your business!\n`;
      textContent += `Generated by DreamBig Business OS\n`;

      const { Share, Platform: RNPlatform } = await import('react-native');
      
      if (RNPlatform.OS === 'web') {
        // For web, create a text file download
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (doc && doc.body) {
          const link = doc.createElement('a');
          if (link) {
            link.href = url;
            link.download = `${document.documentNumber || 'document'}.txt`;
            link.style.display = 'none';
            doc.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (doc.body && link.parentNode) {
                doc.body.removeChild(link);
              }
              URL.revokeObjectURL(url);
            }, 100);
          } else {
            // Fallback if appendChild fails
            const fallbackLink = doc.createElement('a');
            fallbackLink.href = url;
            fallbackLink.download = `${document.documentNumber || 'document'}.txt`;
            fallbackLink.click();
            URL.revokeObjectURL(url);
          }
        } else {
          // Last resort: try direct download
          const link = doc.createElement('a');
          link.href = url;
          link.download = `${document.documentNumber || 'document'}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        }
      } else {
        await Share.share({
          message: textContent,
          title: `${document.type.charAt(0).toUpperCase() + document.type.slice(1)} ${document.documentNumber}`,
        });
      }
    } catch (fallbackError: any) {
      console.error('Fallback share also failed:', fallbackError);
      // Last resort: show user-friendly error
      const { Alert } = await import('react-native');
      Alert.alert(
        'Export Failed',
        `Unable to export document. Error: ${error.message || 'Unknown error'}\n\nPlease try:\n1. Restarting the app\n2. Checking device storage\n3. Contacting support if the issue persists`,
        [{ text: 'OK' }]
      );
      throw new Error(`Failed to export document: ${error.message || 'Unknown error'}`);
    }
  }
}
