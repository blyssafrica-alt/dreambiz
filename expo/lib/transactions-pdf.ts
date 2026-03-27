import type { Transaction, BusinessProfile } from '@/types/business';

export function generateTransactionsPDF(
  transactions: Transaction[],
  business: BusinessProfile,
  period: string,
  startDate: string,
  endDate: string
): string {
  const formatCurrency = (amount: number, currency: string = business.currency || 'USD') => {
    const symbol = currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const accentColor = '#8B0000';
  const primaryColor = '#0066CC';

  // Calculate totals
  const totalSales = transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const profit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

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
          line-height: 1.5;
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
        .report-title {
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
          display: table;
          width: 100%;
          margin-bottom: 35px;
          border-collapse: separate;
          border-spacing: 15px;
        }
        .summary-card {
          display: table-cell;
          width: 25%;
          vertical-align: top;
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #e0e0e0;
          text-align: center;
        }
        .summary-label {
          font-size: 11px;
          font-weight: bold;
          color: #666666;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #333333;
        }
        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #d0d0d0;
        }
        .transactions-table thead {
          background-color: ${accentColor};
          color: #ffffff;
        }
        .transactions-table th {
          padding: 12px 15px;
          text-align: left;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .transactions-table th:nth-child(3),
        .transactions-table th:nth-child(4) {
          text-align: center;
        }
        .transactions-table th:last-child {
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
          padding: 12px 15px;
          font-size: 14px;
          color: #333333;
        }
        .transactions-table td:last-child {
          text-align: right;
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
        .footer-details div {
          margin-bottom: 4px;
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
        <!-- Top Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: ${accentColor};"></div>
        
        <!-- Header Section -->
        <div class="header">
          <div class="header-top">
            <div class="logo-section">
              ${logoHtml || `<div style="font-size: 40px; font-weight: bold; color: #333; display: inline-block; width: 80px; height: 80px; line-height: 80px; text-align: center; background-color: #f0f0f0; border-radius: 50%;">${business.name.charAt(0).toUpperCase()}</div>`}
            </div>
            <div class="report-meta">
              <div class="report-title">Transactions Report</div>
              <div class="report-period">Period: ${period.charAt(0).toUpperCase() + period.slice(1)}</div>
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
          <!-- Summary Cards -->
          <div class="summary-section">
            <div class="summary-card">
              <div class="summary-label">Total Sales</div>
              <div class="summary-value" style="color: #10b981;">${formatCurrency(totalSales)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value" style="color: #ef4444;">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Profit</div>
              <div class="summary-value" style="color: ${profit >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(profit)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Profit Margin</div>
              <div class="summary-value" style="color: ${profitMargin >= 0 ? '#10b981' : '#ef4444'};">${profitMargin.toFixed(1)}%</div>
            </div>
          </div>
      
          <!-- Transactions Table -->
          <table class="transactions-table">
            <thead style="background-color: ${accentColor}; color: #ffffff;">
              <tr>
                <th style="background-color: ${accentColor}; color: #ffffff;">Date</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Type</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Category</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Description</th>
                <th style="background-color: ${accentColor}; color: #ffffff;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map((transaction, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                  <td>${formatDate(transaction.date)}</td>
                  <td style="text-transform: capitalize;">${transaction.type}</td>
                  <td style="text-align: center;">${transaction.category || 'N/A'}</td>
                  <td>${transaction.description}</td>
                  <td style="color: ${transaction.type === 'sale' ? '#10b981' : '#ef4444'};">
                    ${transaction.type === 'sale' ? '+' : '-'}${formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
          <div class="footer-generated">
            <div>Report Period: ${period.charAt(0).toUpperCase() + period.slice(1)} | ${formatDate(startDate)} - ${formatDate(endDate)}</div>
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

export async function exportTransactionsToPDF(
  transactions: Transaction[],
  business: BusinessProfile,
  period: string,
  startDate: string,
  endDate: string
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { Platform } = await import('react-native');
    
    const html = generateTransactionsPDF(transactions, business, period, startDate, endDate);
    
    if (!html || html.trim().length === 0) {
      throw new Error('Failed to generate PDF content');
    }

    // For web, use browser-specific approach
    if (Platform.OS === 'web') {
      try {
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc || !doc.body) {
          throw new Error('Document not available');
        }

        const printWindow = (typeof globalThis !== 'undefined' && (globalThis as any).window ? (globalThis as any).window : null)?.open('', '_blank', 'width=800,height=600');
        if (printWindow && printWindow.document) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
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
      } catch (base64Error: any) {
        try {
          result = await Print.printToFileAsync({
            html,
            base64: true,
            width: 612,
            height: 792,
          });
          
          if (result && result.base64) {
            const FileSystem = await import('expo-file-system');
            const filename = `${(FileSystem as any).documentDirectory}transactions-${period}-${new Date().toISOString().split('T')[0]}.pdf`;
            
            await (FileSystem as any).writeAsStringAsync(filename, result.base64, {
              encoding: (FileSystem as any).EncodingType.Base64,
            });
            
            result = { uri: filename };
          }
        } catch (base64TrueError: any) {
          throw base64TrueError;
        }
      }
      
      if (!result || !result.uri) {
        throw new Error('PDF generation failed');
      }

      if ((Sharing as any).isAvailableAsync && await (Sharing as any).isAvailableAsync()) {
        await (Sharing as any).shareAsync(result.uri);
      } else {
        const { Alert } = await import('react-native');
        Alert.alert('PDF Generated', `PDF saved to: ${result.uri}`);
      }
    }
  } catch (error: any) {
    console.error('PDF export error:', error);
    const { Alert } = await import('react-native');
    let errorMessage = error.message || 'Unknown error';
    
    // Provide helpful message for expo-print issues
    if (errorMessage.includes('expo-print') || errorMessage.includes('not available')) {
      errorMessage = 'expo-print module not available. This is a native module that requires rebuilding the app.\n\nPlease:\n1. Stop the development server\n2. Clear cache: npx expo start -c\n3. Rebuild the app (if using development build)';
    }
    
    Alert.alert(
      'PDF Export Failed',
      `Unable to export transactions as PDF.\n\n${errorMessage}`,
      [{ text: 'OK' }]
    );
    throw error;
  }
}

