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
    if (business.logo.startsWith('http://') || business.logo.startsWith('https://')) {
      logoHtml = `<img src="${business.logo}" alt="${business.name} Logo" style="max-height: 80px; max-width: 200px; object-fit: contain; display: block;" />`;
    } else if (business.logo.startsWith('data:image')) {
      logoHtml = `<img src="${business.logo}" alt="${business.name} Logo" style="max-height: 80px; max-width: 200px; object-fit: contain; display: block;" />`;
    } else {
      logoHtml = `<img src="data:image/png;base64,${business.logo}" alt="${business.name} Logo" style="max-height: 80px; max-width: 200px; object-fit: contain; display: block;" />`;
    }
  }

  // Build company details section
  const companyDetails = [];
  if (business.name) companyDetails.push(`<div><strong>${business.name}</strong></div>`);
  if (business.owner) companyDetails.push(`<div style="color: #666; font-size: 13px;">Owner: ${business.owner}</div>`);
  if (business.address) companyDetails.push(`<div>${business.address}</div>`);
  if (business.location) companyDetails.push(`<div>${business.location}, Zimbabwe</div>`);
  if (business.phone) companyDetails.push(`<div>📞 ${business.phone}</div>`);
  if (business.email) companyDetails.push(`<div>✉️ ${business.email}</div>`);

  // Use solid colors for PDF compatibility
  const primaryColor = template.styling.primaryColor || '#0066CC';
  const accentColor = '#8B0000'; // Dark red accent bars

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 0;
          margin: 0;
          color: #1a1a1a;
          background: #ffffff;
          line-height: 1.5;
        }
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 0;
        }
        /* Accent bars now use inline styles for better PDF compatibility */
        .header {
          background-color: #ffffff;
          padding: 35px 50px 25px 50px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }
        .logo-section {
          flex: 1;
        }
        .logo-section img {
          max-height: 80px;
          max-width: 200px;
          object-fit: contain;
          display: block;
        }
        .document-meta {
          flex: 1;
          text-align: right;
        }
        .document-type {
          font-size: 36px;
          font-weight: bold;
          color: #333333;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .document-number {
          font-size: 14px;
          color: #666666;
          font-weight: normal;
          margin-bottom: 5px;
        }
        .document-date {
          font-size: 13px;
          color: #666666;
          font-weight: normal;
        }
        .company-info {
          margin-top: 20px;
          font-size: 14px;
          color: #333333;
          line-height: 1.8;
        }
        .company-info div {
          margin-bottom: 4px;
        }
        .content-section {
          padding: 0 50px 30px 50px;
          background: #ffffff;
        }
        .info-section {
          display: table;
          width: 100%;
          margin-bottom: 35px;
          border-collapse: separate;
          border-spacing: 0;
        }
        .from-to {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
        }
        .from-to:first-child {
          border-right: none;
        }
        .section-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #d0d0d0;
          padding-bottom: 5px;
        }
        .section-content {
          font-size: 14px;
          color: #333333;
          line-height: 1.8;
        }
        .section-content div {
          margin-bottom: 6px;
        }
        .section-content strong {
          font-weight: bold;
          color: #1a1a1a;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #d0d0d0;
        }
        /* Table header colors now use inline styles for better PDF compatibility */
        .items-table th {
          padding: 12px 15px;
          text-align: left;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .items-table th:nth-child(2),
        .items-table th:nth-child(3),
        .items-table th:nth-child(4) {
          text-align: center;
        }
        .items-table th:last-child {
          text-align: right;
        }
        .items-table tbody tr {
          border-bottom: 1px solid #e8e8e8;
          background-color: #ffffff;
        }
        .items-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .items-table tbody tr:last-child {
          border-bottom: none;
        }
        .items-table td {
          padding: 12px 15px;
          font-size: 14px;
          color: #333333;
        }
        .items-table td:first-child {
          font-weight: bold;
        }
        .items-table td:nth-child(2),
        .items-table td:nth-child(3) {
          text-align: center;
        }
        .items-table td:last-child {
          text-align: right;
          font-weight: bold;
        }
        .totals {
          background-color: #f9f9f9;
          padding: 25px;
          margin-top: 30px;
          border: 1px solid #e0e0e0;
        }
        .totals-inner {
          max-width: 400px;
          margin-left: auto;
        }
        .total-row {
          display: table;
          width: 100%;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .total-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .total-label {
          display: table-cell;
          font-size: 14px;
          font-weight: normal;
          color: #666666;
          text-align: left;
        }
        .total-value {
          display: table-cell;
          font-size: 14px;
          font-weight: bold;
          color: #333333;
          text-align: right;
        }
        .grand-total {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid ${primaryColor};
        }
        .grand-total .total-label {
          font-size: 18px;
          font-weight: bold;
        }
        .grand-total .total-value {
          font-size: 24px;
          font-weight: bold;
        }
        /* Notes section now uses inline styles for better PDF compatibility */
        /* Due date and payment sections now use inline styles for better PDF compatibility */
        /* Status badges now use inline styles for better PDF compatibility */
        .footer {
          margin-top: 50px;
          padding: 30px 50px;
          background-color: #f9f9f9;
          border-top: 1px solid #e0e0e0;
          text-align: center;
        }
        .footer-company {
          font-weight: bold;
          color: #333333;
          font-size: 16px;
          margin-bottom: 12px;
        }
        .footer-details {
          color: #666666;
          line-height: 1.8;
          margin-bottom: 15px;
          font-size: 13px;
        }
        .footer-details div {
          margin-bottom: 4px;
        }
        .footer-text {
          margin-bottom: 6px;
          color: #999999;
          font-size: 13px;
        }
        .footer-generated {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          font-size: 10px;
          color: #999999;
        }
        @media print {
          body {
            padding: 0;
            background: white;
          }
          .page {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Top Accent Bar - INLINE STYLE FOR RELIABILITY -->
        <div style="width: 100%; height: 10px; background-color: ${accentColor};"></div>
        
        <!-- Header Section -->
        <div class="header">
          <div class="header-top">
            <div class="logo-section">
              ${logoHtml || `<div style="font-size: 40px; font-weight: bold; color: #333; display: inline-block; width: 80px; height: 80px; line-height: 80px; text-align: center; background-color: #f0f0f0; border-radius: 50%;">${business.name.charAt(0).toUpperCase()}</div>`}
            </div>
            <div class="document-meta">
              <div class="document-type">${document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ')}</div>
              <div class="document-number">#${document.documentNumber}</div>
              <div class="document-date">${formatDate(document.date)}</div>
            </div>
          </div>
          <div class="company-info">
            ${companyDetails.join('')}
          </div>
        </div>
        
        <!-- Content Section -->
        <div class="content-section">
          <!-- Billing Information -->
          <div class="info-section">
            <div class="from-to">
              <div class="section-title" style="color: ${primaryColor};">From</div>
              <div class="section-content">
                <div><strong>${business.name}</strong></div>
                ${business.owner ? `<div style="color: #666; font-size: 13px;">Owner: ${business.owner}</div>` : ''}
                ${business.address ? `<div>${business.address}</div>` : ''}
                ${business.location ? `<div>${business.location}, Zimbabwe</div>` : ''}
                ${business.phone ? `<div>📞 ${business.phone}</div>` : ''}
                ${business.email ? `<div>✉️ ${business.email}</div>` : ''}
              </div>
            </div>
            <div class="from-to">
              <div class="section-title" style="color: ${primaryColor};">${document.type === 'purchase_order' || document.type === 'supplier_agreement' ? 'Supplier' : 'Bill To'}</div>
              <div class="section-content">
                <div><strong>${document.customerName}</strong></div>
                ${document.customerPhone ? `<div>📞 ${document.customerPhone}</div>` : ''}
                ${document.customerEmail ? `<div>✉️ ${document.customerEmail}</div>` : ''}
              </div>
            </div>
          </div>
      
          <!-- Items Table - INLINE STYLES FOR COLORS -->
          <table class="items-table">
            <thead style="background-color: ${accentColor}; color: #ffffff;">
              <tr>
                <th style="background-color: ${accentColor}; color: #ffffff;">Description</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Qty</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Unit Price</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${document.items.map((item, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                  <td><strong>${item.description}</strong></td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td style="color: ${primaryColor}; font-weight: bold;">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals Section -->
          <div class="totals">
            <div class="totals-inner">
              <div class="total-row">
                <span class="total-label">Subtotal</span>
                <span class="total-value">${formatCurrency(document.subtotal)}</span>
              </div>
              ${(document as any).discountAmount ? `
                <div class="total-row" style="color: #10b981;">
                  <span class="total-label">Discount</span>
                  <span class="total-value" style="color: #10b981;">-${formatCurrency((document as any).discountAmount)}</span>
                </div>
              ` : ''}
              ${document.tax ? `
                <div class="total-row">
                  <span class="total-label">Tax</span>
                  <span class="total-value">${formatCurrency(document.tax)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span class="total-label" style="color: ${primaryColor}; font-size: 18px; font-weight: bold;">Total</span>
                <span class="total-value" style="color: ${primaryColor}; font-size: 24px; font-weight: bold;">${formatCurrency(document.total)}</span>
              </div>
              ${(document as any).amountReceived ? `
                <div class="total-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  <span class="total-label">Amount Received</span>
                  <span class="total-value">${formatCurrency((document as any).amountReceived)}</span>
                </div>
                ${(document as any).changeAmount > 0 ? `
                  <div class="total-row" style="color: #10b981;">
                    <span class="total-label">Change</span>
                    <span class="total-value" style="color: #10b981;">${formatCurrency((document as any).changeAmount)}</span>
                  </div>
                ` : ''}
              ` : ''}
              ${document.paidAmount && document.paidAmount < document.total ? `
                <div class="total-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  <span class="total-label">Paid Amount</span>
                  <span class="total-value">${formatCurrency(document.paidAmount)}</span>
                </div>
                <div class="total-row" style="color: #f59e0b;">
                  <span class="total-label">Balance Due</span>
                  <span class="total-value" style="color: #f59e0b;">${formatCurrency(document.total - document.paidAmount)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          ${document.paymentMethod ? `
            <div class="payment-section" style="background-color: #f0f8ff; padding: 20px; margin-top: 30px; border-left: 4px solid ${primaryColor};">
              <div class="payment-title" style="font-weight: bold; color: ${primaryColor}; margin-bottom: 8px; font-size: 12px; text-transform: uppercase;">Payment Information</div>
              <div class="payment-content" style="color: #333333; line-height: 1.7; font-size: 14px;">
                <div><strong>Payment Method:</strong> ${document.paymentMethod.replace('_', ' ').toUpperCase()}</div>
                ${document.paymentMethod === 'card' || document.paymentMethod === 'bank_transfer' || document.paymentMethod === 'mobile_money' ? `
                  <div style="margin-top: 8px; font-size: 13px; color: #666;">
                    ${document.status === 'paid' ? '✓ Payment Completed' : 'Payment Pending'}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
          
          ${document.status ? `
            <div style="text-align: center; margin-top: 25px;">
              <span style="display: inline-block; padding: 10px 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #ffffff; background-color: ${document.status === 'paid' ? '#10b981' : document.status === 'pending' ? '#f59e0b' : '#ef4444'};">
                Status: ${document.status.toUpperCase()}
              </span>
            </div>
          ` : ''}
          
          ${document.dueDate ? `
            <div class="due-date-section" style="background-color: #f0f8ff; padding: 20px; margin-top: 30px; text-align: center; border: 1px solid ${primaryColor};">
              <div class="due-date-label" style="font-size: 11px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; margin-bottom: 8px;">Payment Due Date</div>
              <div class="due-date-value" style="font-size: 18px; font-weight: bold; color: ${primaryColor};">${formatDate(document.dueDate)}</div>
            </div>
          ` : ''}
          
          ${document.notes ? `
            <div class="notes-section" style="background-color: #fff9e6; border-left: 4px solid #f59e0b; padding: 20px; margin-top: 30px;">
              <div class="notes-title" style="font-weight: bold; color: #92400e; margin-bottom: 8px; font-size: 12px; text-transform: uppercase;">Notes & Terms</div>
              <div class="notes-content" style="color: #78350f; line-height: 1.7; font-size: 14px;">${document.notes}</div>
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
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
            <div class="footer-text" style="margin-top: 8px; font-size: 13px; color: #666; font-weight: bold;">
              Served by: ${document.employeeName}
            </div>
          ` : ''}
          <div class="footer-generated">
            <div>Document #${document.documentNumber} | Date: ${formatDate(document.date)}</div>
            <div style="margin-top: 4px;">Generated by DreamBig Business OS</div>
          </div>
        </div>
        
        <!-- Bottom Accent Bar - INLINE STYLE FOR RELIABILITY -->
        <div style="width: 100%; height: 10px; background-color: ${accentColor};"></div>
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
      throw new Error('expo-print module not available. This is a native module that requires rebuilding the app. Please:\n1. Stop the development server\n2. Clear cache: npx expo start -c\n3. Rebuild the app (if using development build)\n4. Or use: npx expo prebuild (if using bare workflow)');
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
          const printWindow = (typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window : null)?.open('', '_blank', 'width=800,height=600');
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
        const blob = typeof Blob !== 'undefined' ? new Blob([html], { type: 'text/html;charset=utf-8', lastModified: Date.now() }) : null;
        if (!blob) {
          throw new Error('Blob API not available');
        }
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
            const FileSystem = await import('expo-file-system');
            const base64Data = result.base64;
            const filename = `${(FileSystem as any).documentDirectory}${document.documentNumber || 'document'}.pdf`;
            
            await (FileSystem as any).writeAsStringAsync(filename, base64Data, {
              encoding: (FileSystem as any).EncodingType.Base64,
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
    
    // Show user-friendly error - no text fallback, PDF only
    const { Alert } = await import('react-native');
    Alert.alert(
      'PDF Export Failed',
      `Unable to export document as PDF. Error: ${error.message || 'Unknown error'}\n\nPlease try:\n1. Restarting the app\n2. Checking device storage\n3. Ensuring expo-print is installed\n4. Contacting support if the issue persists`,
      [{ text: 'OK' }]
    );
    throw new Error(`Failed to export document as PDF: ${error.message || 'Unknown error'}`);
  }
}
