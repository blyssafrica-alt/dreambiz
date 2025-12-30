import type { BusinessProfile } from '@/types/business';

export interface BusinessPlanMetrics {
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  cashPosition: number;
  topCategories: Array<{ category: string; amount: number }>;
  alerts: Array<{ message: string; action?: string }>;
}

export function generateBusinessPlanPDF(
  business: BusinessProfile,
  metrics: BusinessPlanMetrics
): string {
  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return business?.currency === 'USD' ? '$0.00' : 'ZWL0.00';
    }
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Handle logo
  let logoHtml = '';
  if (business.logo) {
    if (business.logo.startsWith('http://') || business.logo.startsWith('https://')) {
      logoHtml = `<img src="${business.logo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 20px; object-fit: contain;" />`;
    } else if (business.logo.startsWith('data:image')) {
      logoHtml = `<img src="${business.logo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 20px; object-fit: contain;" />`;
    } else {
      logoHtml = `<img src="data:image/png;base64,${business.logo}" alt="Logo" style="max-height: 80px; max-width: 200px; margin-bottom: 20px; object-fit: contain;" />`;
    }
  }

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
        }
        .header {
          background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
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
        .content-section {
          padding: 40px;
          background: #ffffff;
        }
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 24px;
          font-weight: 800;
          color: #0066CC;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 3px solid #0066CC;
        }
        .section-content {
          font-size: 15px;
          color: #333;
          line-height: 1.8;
        }
        .section-content p {
          margin-bottom: 12px;
        }
        .section-content ul {
          margin-left: 20px;
          margin-bottom: 12px;
        }
        .section-content li {
          margin-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .info-item {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border-left: 4px solid #0066CC;
        }
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #0066CC;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        .financial-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .financial-table thead {
          background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
          color: white;
        }
        .financial-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .financial-table tbody tr {
          border-bottom: 1px solid #f0f0f0;
        }
        .financial-table tbody tr:last-child {
          border-bottom: none;
        }
        .financial-table td {
          padding: 16px;
          font-size: 15px;
          color: #333;
        }
        .financial-table td:last-child {
          font-weight: 600;
          color: #0066CC;
          text-align: right;
        }
        .alert-item {
          background: #fff9e6;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .alert-message {
          font-weight: 600;
          color: #78350F;
          margin-bottom: 4px;
        }
        .alert-action {
          font-size: 13px;
          color: #92400E;
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
        @media print {
          body {
            padding: 0;
          }
          .section {
            page-break-inside: avoid;
          }
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
              <div class="document-type">Business Plan</div>
            </div>
          </div>
        </div>
        
        <div class="content-section">
          <div class="section">
            <div class="section-title">1. EXECUTIVE SUMMARY</div>
            <div class="section-content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Business Name</div>
                  <div class="info-value">${business.name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Owner</div>
                  <div class="info-value">${business.owner}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Industry</div>
                  <div class="info-value">${business.type.charAt(0).toUpperCase() + business.type.slice(1)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div class="info-value">${business.location}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Stage</div>
                  <div class="info-value">${business.stage.charAt(0).toUpperCase() + business.stage.slice(1)}</div>
                </div>
                ${business.phone ? `
                <div class="info-item">
                  <div class="info-label">Contact</div>
                  <div class="info-value">${business.phone}</div>
                </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. BUSINESS DESCRIPTION</div>
            <div class="section-content">
              <p><strong>${business.name}</strong> is a ${business.type} business based in ${business.location}, Zimbabwe. The business is currently in the ${business.stage} stage of operations.</p>
              <p><strong>Mission:</strong><br>To provide quality products/services to our customers while maintaining profitable operations and sustainable growth.</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. MARKET ANALYSIS</div>
            <div class="section-content">
              <p><strong>Target Market:</strong></p>
              <ul>
                <li>Local customers in ${business.location}</li>
                <li>Growing demand for ${business.type} services/products</li>
                <li>Competitive pricing strategy</li>
              </ul>
              <p><strong>Competition:</strong></p>
              <ul>
                <li>Analysis of local competitors</li>
                <li>Differentiation through quality and service</li>
                <li>Focus on customer relationships</li>
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">4. FINANCIAL PLAN</div>
            <div class="section-content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Starting Capital</div>
                  <div class="info-value">${formatCurrency(business.capital)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Currency</div>
                  <div class="info-value">${business.currency}</div>
                </div>
              </div>
              
              <p><strong>Current Financial Position:</strong></p>
              <table class="financial-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Monthly Sales</td>
                    <td>${formatCurrency(metrics.monthSales)}</td>
                  </tr>
                  <tr>
                    <td>Monthly Expenses</td>
                    <td>${formatCurrency(metrics.monthExpenses)}</td>
                  </tr>
                  <tr>
                    <td>Monthly Profit</td>
                    <td>${formatCurrency(metrics.monthProfit)}</td>
                  </tr>
                  <tr>
                    <td>Cash Position</td>
                    <td>${formatCurrency(metrics.cashPosition)}</td>
                  </tr>
                </tbody>
              </table>

              ${metrics.topCategories && metrics.topCategories.length > 0 ? `
              <p><strong>Revenue Sources:</strong></p>
              <table class="financial-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${metrics.topCategories.map((cat: any, index: number) => `
                    <tr>
                      <td>${index + 1}. ${cat.category}</td>
                      <td>${formatCurrency(cat.amount)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">5. OPERATIONS PLAN</div>
            <div class="section-content">
              <p><strong>Daily Operations:</strong></p>
              <ul>
                <li>Customer service and sales</li>
                <li>Inventory management</li>
                <li>Financial record keeping</li>
                <li>Quality control</li>
              </ul>
              <p><strong>Key Activities:</strong></p>
              <ul>
                <li>Product/service delivery</li>
                <li>Marketing and promotion</li>
                <li>Customer relationship management</li>
                <li>Supplier coordination</li>
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">6. MARKETING STRATEGY</div>
            <div class="section-content">
              <p><strong>Marketing Channels:</strong></p>
              <ul>
                <li>Word of mouth and referrals</li>
                <li>Local advertising</li>
                <li>Social media presence</li>
                <li>Community engagement</li>
              </ul>
              <p><strong>Pricing Strategy:</strong></p>
              <ul>
                <li>Competitive market pricing</li>
                <li>Value-based pricing for premium services</li>
                <li>Flexible payment terms when appropriate</li>
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">7. GROWTH STRATEGY</div>
            <div class="section-content">
              <p><strong>Short-term Goals (6-12 months):</strong></p>
              <ul>
                <li>Increase monthly revenue by 20%</li>
                <li>Build customer base</li>
                <li>Improve operational efficiency</li>
                <li>Maintain positive cash flow</li>
              </ul>
              <p><strong>Long-term Goals (1-3 years):</strong></p>
              <ul>
                <li>Expand product/service offerings</li>
                <li>Consider additional locations</li>
                <li>Build brand recognition</li>
                <li>Achieve sustainable profitability</li>
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">8. RISK MANAGEMENT</div>
            <div class="section-content">
              <p><strong>Identified Risks:</strong></p>
              <ul>
                <li>Economic fluctuations and inflation</li>
                <li>Currency volatility (USD/ZWL)</li>
                <li>Competition</li>
                <li>Supply chain disruptions</li>
              </ul>
              <p><strong>Risk Mitigation:</strong></p>
              <ul>
                <li>Maintain cash reserves</li>
                <li>Diversify revenue streams</li>
                <li>Build strong supplier relationships</li>
                <li>Regular financial monitoring</li>
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">9. SUCCESS METRICS</div>
            <div class="section-content">
              <p><strong>Key Performance Indicators:</strong></p>
              <ul>
                <li>Monthly revenue growth</li>
                <li>Profit margins</li>
                <li>Customer retention rate</li>
                <li>Cash flow positivity</li>
                <li>Break-even achievement</li>
              </ul>
            </div>
          </div>

          ${metrics.alerts && metrics.alerts.length > 0 ? `
          <div class="section">
            <div class="section-title">10. CURRENT ALERTS & ACTION ITEMS</div>
            <div class="section-content">
              ${metrics.alerts.map((alert: any, index: number) => `
                <div class="alert-item">
                  <div class="alert-message">${index + 1}. ${alert.message}</div>
                  ${alert.action ? `<div class="alert-action">Action: ${alert.action}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">CONCLUSION</div>
            <div class="section-content">
              <p><strong>${business.name}</strong> is positioned for growth in the ${business.location} market. With a focus on quality, customer service, and financial discipline, we aim to build a sustainable and profitable business that serves our community.</p>
              <p>This plan will be reviewed and updated quarterly to reflect changing market conditions and business performance.</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text"><strong>Generated by DreamBig Business OS</strong></div>
          <div class="footer-text">Thank you for using DreamBig Business OS! 🙏</div>
          <div class="footer-text" style="margin-top: 8px; font-size: 11px; color: #bbb;">
            Generated on: ${formatDate(new Date().toISOString())}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export async function exportBusinessPlanToPDF(
  business: BusinessProfile,
  metrics: BusinessPlanMetrics
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    
    const html = generateBusinessPlanPDF(business, metrics);
    
    const { uri } = await (Print as any).printToFileAsync({
      html,
      base64: false,
      width: 612, // A4 width in points
      height: 792, // A4 height in points
    });
    
    if ((Sharing as any).isAvailableAsync && await (Sharing as any).isAvailableAsync()) {
      await (Sharing as any).shareAsync(uri);
    } else {
      const { Alert, Platform } = await import('react-native');
      if (Platform.OS === 'web') {
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (doc) {
          const link = doc.createElement('a');
          link.href = uri;
          link.download = `${business.name.replace(/[^a-z0-9]/gi, '_')}-Business-Plan.pdf`;
          link.click();
        }
      } else {
        Alert.alert('PDF Generated', `PDF saved to: ${uri}`);
      }
    }
  } catch (error: any) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF. Please ensure expo-print is installed and try again.');
  }
}

