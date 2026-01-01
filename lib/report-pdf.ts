import type { Transaction, BusinessProfile } from '@/types/business';
import { Platform } from 'react-native';

export interface ReportData {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  topSalesCategories: { category: string; amount: number }[];
  topExpenseCategories: { category: string; amount: number }[];
  transactionCount: number;
}

export function generateReportPDF(
  reportData: ReportData,
  transactions: Transaction[],
  business: BusinessProfile,
  period: string,
  startDate: string,
  endDate: string,
  type: 'summary' | 'detailed'
): string {
  const formatCurrency = (amount: number, currency: string = business.currency || 'USD') => {
    const symbol = currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const accentColor = '#8B0000';
  const primaryColor = '#0066CC';

  // Handle logo
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
          line-height: 1.6;
        }
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 0;
        }
        .header {
          background-color: #ffffff;
          padding: 40px 50px 30px 50px;
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
        .report-meta {
          flex: 1;
          text-align: right;
        }
        .report-type {
          font-size: 36px;
          font-weight: bold;
          color: #333333;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-period {
          font-size: 14px;
          color: #666666;
          font-weight: normal;
          margin-bottom: 5px;
        }
        .report-date {
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
        .summary-section {
          background-color: #f9f9f9;
          padding: 25px;
          margin-bottom: 30px;
          border: 1px solid #e0e0e0;
        }
        .summary-title {
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-bottom: 10px;
        }
        .summary-row {
          display: table;
          width: 100%;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        .summary-row:last-child {
          border-bottom: none;
        }
        .summary-label {
          display: table-cell;
          font-size: 15px;
          font-weight: normal;
          color: #666666;
          text-align: left;
          width: 50%;
        }
        .summary-value {
          display: table-cell;
          font-size: 15px;
          font-weight: bold;
          color: #333333;
          text-align: right;
        }
        .categories-section {
          margin-bottom: 30px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-bottom: 8px;
        }
        .category-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          border: 1px solid #d0d0d0;
        }
        .category-table thead {
          /* Colors now use inline styles */
        }
        .category-table th {
          padding: 12px 15px;
          text-align: left;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .category-table th:last-child {
          text-align: right;
        }
        .category-table tbody tr {
          border-bottom: 1px solid #e8e8e8;
          background-color: #ffffff;
        }
        .category-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .category-table tbody tr:last-child {
          border-bottom: none;
        }
        .category-table td {
          padding: 12px 15px;
          font-size: 14px;
          color: #333333;
        }
        .category-table td:last-child {
          text-align: right;
          font-weight: bold;
        }
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #d0d0d0;
        }
        .transactions-table thead {
          /* Colors now use inline styles */
        }
        .transactions-table th {
          padding: 12px 10px;
          text-align: left;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .transactions-table th:nth-child(4),
        .transactions-table th:nth-child(5) {
          text-align: right;
        }
        .transactions-table tbody tr {
          border-bottom: 1px solid #e8e8e8;
          background-color: #ffffff;
        }
        .transactions-table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .transactions-table tbody tr:last-child {
          border-bottom: none;
        }
        .transactions-table td {
          padding: 10px;
          font-size: 13px;
          color: #333333;
        }
        .transactions-table td:nth-child(4),
        .transactions-table td:nth-child(5) {
          text-align: right;
        }
        .transactions-table td.amount-positive {
          color: #10b981;
          font-weight: bold;
        }
        .transactions-table td.amount-negative {
          color: #ef4444;
          font-weight: bold;
        }
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
        .footer-generated {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          font-size: 10px;
          color: #999999;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Top Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: ${accentColor};"></div>
        
        <!-- Header Section -->
        <div class="header">
          <div class="header-top">
            <div class="logo-section">
              ${logoHtml || `<div style="font-size: 40px; font-weight: bold; color: #333; display: inline-block; width: 80px; height: 80px; line-height: 80px; text-align: center; background-color: #f0f0f0; border-radius: 50%;">${business.name.charAt(0).toUpperCase()}</div>`}
            </div>
            <div class="report-meta">
              <div class="report-type">${type === 'summary' ? 'Financial Report' : 'Transaction Report'}</div>
              <div class="report-period">${period.toUpperCase()}</div>
              <div class="report-date">${formatDate(startDate)} - ${formatDate(endDate)}</div>
            </div>
          </div>
          <div class="company-info">
            <div><strong>${business.name}</strong></div>
            ${business.owner ? `<div style="color: #666; font-size: 13px;">Owner: ${business.owner}</div>` : ''}
            ${business.address ? `<div>${business.address}</div>` : ''}
            ${business.location ? `<div>${business.location}, Zimbabwe</div>` : ''}
            ${business.phone ? `<div>📞 ${business.phone}</div>` : ''}
            ${business.email ? `<div>✉️ ${business.email}</div>` : ''}
          </div>
        </div>
        
        <!-- Content Section -->
        <div class="content-section">
          ${type === 'summary' ? `
            <!-- Summary Section -->
            <div class="summary-section">
              <div class="summary-title" style="color: ${primaryColor}; border-bottom-color: ${primaryColor};">Financial Summary</div>
              <div class="summary-row">
                <span class="summary-label">Total Sales</span>
                <span class="summary-value positive">${formatCurrency(reportData.totalSales)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Expenses</span>
                <span class="summary-value negative">${formatCurrency(reportData.totalExpenses)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Net Profit</span>
                <span class="summary-value" style="color: ${reportData.profit >= 0 ? '#10b981' : '#ef4444'}; font-size: 18px;">${formatCurrency(reportData.profit)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Profit Margin</span>
                <span class="summary-value" style="color: ${reportData.profitMargin >= 0 ? '#10b981' : '#ef4444'}; font-size: 18px;">${reportData.profitMargin.toFixed(2)}%</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Transactions</span>
                <span class="summary-value">${reportData.transactionCount}</span>
              </div>
            </div>

            <!-- Top Sales Categories -->
            ${reportData.topSalesCategories.length > 0 ? `
              <div class="categories-section">
                <div class="section-title" style="color: ${primaryColor}; border-bottom-color: ${primaryColor};">Top Sales Categories</div>
                <table class="category-table">
                  <thead style="background-color: ${accentColor}; color: #ffffff;">
                    <tr>
                      <th style="background-color: ${accentColor}; color: #ffffff;">Rank</th>
                      <th style="background-color: ${accentColor}; color: #ffffff;">Category</th>
                      <th style="background-color: ${accentColor}; color: #ffffff; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.topSalesCategories.map((cat, i) => `
                      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                        <td>${i + 1}</td>
                        <td><strong>${cat.category}</strong></td>
                        <td style="text-align: right; font-weight: bold; color: ${primaryColor};">${formatCurrency(cat.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- Top Expense Categories -->
            ${reportData.topExpenseCategories.length > 0 ? `
              <div class="categories-section">
                <div class="section-title" style="color: ${primaryColor}; border-bottom-color: ${primaryColor};">Top Expense Categories</div>
                <table class="category-table">
                  <thead style="background-color: ${accentColor}; color: #ffffff;">
                    <tr>
                      <th style="background-color: ${accentColor}; color: #ffffff;">Rank</th>
                      <th style="background-color: ${accentColor}; color: #ffffff;">Category</th>
                      <th style="background-color: ${accentColor}; color: #ffffff; text-align: right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.topExpenseCategories.map((cat, i) => `
                      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                        <td>${i + 1}</td>
                        <td><strong>${cat.category}</strong></td>
                        <td style="text-align: right; font-weight: bold; color: ${primaryColor};">${formatCurrency(cat.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          ` : `
            <!-- Detailed Transactions Table -->
            <div class="categories-section">
              <div class="section-title" style="color: ${primaryColor}; border-bottom-color: ${primaryColor};">All Transactions</div>
              <table class="transactions-table">
                <thead style="background-color: ${accentColor}; color: #ffffff;">
                  <tr>
                    <th style="background-color: ${accentColor}; color: #ffffff;">Date</th>
                    <th style="background-color: ${accentColor}; color: #ffffff;">Type</th>
                    <th style="background-color: ${accentColor}; color: #ffffff;">Category</th>
                    <th style="background-color: ${accentColor}; color: #ffffff; text-align: right;">Description</th>
                    <th style="background-color: ${accentColor}; color: #ffffff; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.filter(t => t.date >= startDate && t.date <= endDate).map((t, i) => `
                    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                      <td>${formatDate(t.date)}</td>
                      <td><strong>${t.type.toUpperCase()}</strong></td>
                      <td>${t.category}</td>
                      <td style="text-align: right;">${t.description}</td>
                      <td class="${t.type === 'sale' ? 'amount-positive' : 'amount-negative'}" style="text-align: right; font-weight: bold; color: ${t.type === 'sale' ? '#10b981' : '#ef4444'};">${t.type === 'sale' ? '+' : '-'}${formatCurrency(t.amount, t.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-company">${business.name}</div>
          <div class="footer-details">
            ${business.address ? `<div>${business.address}</div>` : ''}
            ${business.location ? `<div>${business.location}, Zimbabwe</div>` : ''}
            ${business.phone ? `<div>Phone: ${business.phone}</div>` : ''}
            ${business.email ? `<div>Email: ${business.email}</div>` : ''}
          </div>
          <div class="footer-generated">
            <div>Report Period: ${formatDate(startDate)} - ${formatDate(endDate)}</div>
            <div style="margin-top: 4px;">Generated by DreamBig Business OS</div>
          </div>
        </div>
        
        <!-- Bottom Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: ${accentColor};"></div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export async function exportReportToPDF(
  reportData: ReportData,
  transactions: Transaction[],
  business: BusinessProfile,
  period: string,
  startDate: string,
  endDate: string,
  type: 'summary' | 'detailed'
): Promise<void> {
  try {
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
    const { Platform } = await import('react-native');
    
    const html = generateReportPDF(reportData, transactions, business, period, startDate, endDate, type);
    
    if (!html || html.trim().length === 0) {
      throw new Error('Failed to generate PDF content');
    }

    console.log('Generating Report PDF with HTML length:', html.length);
    
    // For web, use browser-specific approach
    if (Platform.OS === 'web') {
      try {
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc || !doc.body) {
          throw new Error('Document not available');
        }

        try {
          const printWindow = (typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window : null)?.open('', '_blank', 'width=800,height=600');
          if (printWindow && printWindow.document) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
            }, 250);
            return;
          }
        } catch (printError: any) {
          console.log('Print window failed, trying download:', printError);
        }

        const blob = typeof Blob !== 'undefined' ? new Blob([html], { type: 'text/html;charset=utf-8' }) : null;
        if (!blob) {
          throw new Error('Blob API not available');
        }
        const url = URL.createObjectURL(blob);
        const link = doc.createElement('a');
        if (link) {
          link.href = url;
          link.download = `report-${period}-${new Date().toISOString().split('T')[0]}.html`;
          link.style.display = 'none';
          if (doc.body) {
            doc.body.appendChild(link);
            link.click();
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
            'Report Exported',
            'HTML document downloaded. You can open it in your browser and use "Print to PDF" to save as PDF.',
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (webError: any) {
        console.error('Web export failed:', webError);
      }
    }
    
    // For native platforms, use expo-print
    if (Platform.OS !== 'web') {
      let result: any;
      try {
        result = await Print.printToFileAsync({
          html,
          base64: false,
          width: 612,
          height: 792,
        });
        console.log('PDF generation result:', result);
      } catch (base64Error: any) {
        console.log('Base64 false failed, trying with base64 true:', base64Error);
        try {
          result = await Print.printToFileAsync({
            html,
            base64: true,
            width: 612,
            height: 792,
          });
          console.log('PDF generation with base64 result:', result);
          
          if (result && result.base64) {
            const FileSystem = await import('expo-file-system');
            const base64Data = result.base64;
            const filename = `${(FileSystem as any).documentDirectory}report-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
            
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

      console.log('Report PDF generated successfully at:', uri);
    
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
      throw new Error('PDF export not supported on web platform. Please use a native device.');
    }
  } catch (error: any) {
    console.error('Report PDF export error:', error);
    const { Alert } = await import('react-native');
    Alert.alert(
      'Export Failed',
      `Unable to export report. Error: ${error.message || 'Unknown error'}\n\nPlease try:\n1. Restarting the app\n2. Checking device storage\n3. Contacting support if the issue persists`,
      [{ text: 'OK' }]
    );
    throw new Error(`Failed to export report: ${error.message || 'Unknown error'}`);
  }
}

