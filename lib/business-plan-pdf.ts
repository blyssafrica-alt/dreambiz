import type { BusinessProfile } from '@/types/business';

export interface BusinessPlanMetrics {
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  cashPosition: number;
  topCategories: Array<{ category: string; amount: number }>;
  alerts: Array<{ message: string; action?: string }>;
}

// Extended interface to include more business data
export interface ExtendedBusinessPlanData {
  business: BusinessProfile;
  metrics: BusinessPlanMetrics;
  totalCustomers?: number;
  totalProducts?: number;
  totalEmployees?: number;
  averageTransactionValue?: number;
  profitMargin?: number;
  growthRate?: number;
}

export function generateBusinessPlanPDF(
  business: BusinessProfile,
  metrics: BusinessPlanMetrics,
  extendedData?: Partial<ExtendedBusinessPlanData>
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

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate insights
  const profitMargin = metrics.monthSales > 0 
    ? ((metrics.monthProfit / metrics.monthSales) * 100) 
    : 0;
  
  const expenseRatio = metrics.monthSales > 0 
    ? ((metrics.monthExpenses / metrics.monthSales) * 100) 
    : 100;
  
  const isProfitable = metrics.monthProfit > 0;
  const hasPositiveCashFlow = metrics.cashPosition > business.capital;
  const cashGrowth = metrics.cashPosition - business.capital;
  const cashGrowthPercent = business.capital > 0 
    ? ((cashGrowth / business.capital) * 100) 
    : 0;

  // Generate personalized insights
  const getBusinessStageInsights = () => {
    switch (business.stage) {
      case 'startup':
        return {
          focus: 'Establishing market presence and building customer base',
          priorities: ['Customer acquisition', 'Cash flow management', 'Product/service validation'],
          timeline: '0-12 months'
        };
      case 'growth':
        return {
          focus: 'Scaling operations and expanding market reach',
          priorities: ['Operational efficiency', 'Market expansion', 'Team building'],
          timeline: '1-3 years'
        };
      case 'mature':
        return {
          focus: 'Optimizing operations and maintaining market position',
          priorities: ['Cost optimization', 'Innovation', 'Customer retention'],
          timeline: '3+ years'
        };
      default:
        return {
          focus: 'Building sustainable operations',
          priorities: ['Financial stability', 'Customer satisfaction', 'Operational excellence'],
          timeline: 'Ongoing'
        };
    }
  };

  const stageInsights = getBusinessStageInsights();

  // Generate industry-specific insights
  const getIndustryInsights = () => {
    const industry = business.type.toLowerCase();
    if (industry.includes('retail') || industry.includes('shop')) {
      return {
        market: 'Retail sector in Zimbabwe showing resilience with focus on essential goods',
        opportunities: ['E-commerce integration', 'Loyalty programs', 'Product diversification'],
        challenges: ['Currency volatility', 'Supply chain management', 'Competition']
      };
    } else if (industry.includes('service')) {
      return {
        market: 'Service industry benefiting from growing demand for professional services',
        opportunities: ['Digital transformation', 'Subscription models', 'Partnerships'],
        challenges: ['Talent acquisition', 'Service quality consistency', 'Pricing pressure']
      };
    } else if (industry.includes('manufacturing') || industry.includes('production')) {
      return {
        market: 'Manufacturing sector focusing on local production and import substitution',
        opportunities: ['Export markets', 'Technology adoption', 'Supply chain optimization'],
        challenges: ['Raw material costs', 'Energy costs', 'Regulatory compliance']
      };
    } else {
      return {
        market: 'Diverse business landscape in Zimbabwe with opportunities for growth',
        opportunities: ['Market expansion', 'Digital adoption', 'Strategic partnerships'],
        challenges: ['Economic volatility', 'Access to capital', 'Market competition']
      };
    }
  };

  const industryInsights = getIndustryInsights();

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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 0;
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
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100%;
          text-align: center;
          padding: 80px 60px;
          background-color: #ffffff;
          position: relative;
        }
        .cover-logo {
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }
        .cover-logo img {
          max-height: 140px;
          max-width: 320px;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        /* Cover page styles - colors now use inline styles for better PDF compatibility */
        .cover-title {
          font-size: 56px;
          font-weight: 900;
          margin-bottom: 24px;
          line-height: 1.1;
          letter-spacing: -1px;
          position: relative;
          z-index: 1;
        }
        .cover-subtitle {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 48px;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 1;
        }
        .cover-info {
          font-size: 17px;
          line-height: 2.2;
          font-weight: 500;
          position: relative;
          z-index: 1;
        }
        .cover-info strong {
          font-weight: 700;
        }
        .cover-date {
          margin-top: 80px;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          z-index: 1;
        }
        .header {
          background-color: #0066CC;
          color: white;
          padding: 40px 56px;
          border-radius: 0;
          margin-bottom: 0;
          position: relative;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }
        .logo-section {
          flex: 1;
        }
        .logo-section img {
          max-height: 80px;
          max-width: 200px;
          background: white;
          padding: 14px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .business-info {
          flex: 1;
          text-align: right;
        }
        .business-name {
          font-size: 32px;
          font-weight: 900;
          color: white;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }
        .document-type {
          font-size: 18px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .content-section {
          padding: 56px;
        }
        .section {
          margin-bottom: 60px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 32px;
          font-weight: 900;
          color: #0066CC;
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 4px solid #0066CC;
          letter-spacing: -0.5px;
        }
        .section-subtitle {
          font-size: 22px;
          font-weight: 800;
          color: #1e293b;
          margin-top: 32px;
          margin-bottom: 16px;
          letter-spacing: -0.3px;
        }
        .section-content {
          font-size: 16px;
          color: #334155;
          line-height: 1.9;
          font-weight: 400;
        }
        .section-content p {
          margin-bottom: 20px;
          text-align: justify;
        }
        .section-content ul, .section-content ol {
          margin-left: 28px;
          margin-bottom: 20px;
        }
        .section-content li {
          margin-bottom: 12px;
        }
        /* Highlight boxes now use inline styles for better PDF compatibility */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 36px;
        }
        /* Info items now use inline styles for better PDF compatibility */
        .info-label {
          font-size: 11px;
          font-weight: 800;
          color: #0066CC;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        .info-value {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.3px;
        }
        .metric-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .metric-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .metric-value {
          font-size: 40px;
          font-weight: 900;
          color: #0066CC;
          margin-bottom: 10px;
          letter-spacing: -1px;
        }
        .metric-change {
          font-size: 15px;
          font-weight: 700;
        }
        .metric-change.positive {
          color: #10B981;
        }
        .metric-change.negative {
          color: #EF4444;
        }
        .financial-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 32px 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
        }
        /* Financial table header now uses inline styles for better PDF compatibility */
        .financial-table th {
          padding: 20px;
          text-align: left;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .financial-table th:first-child {
          padding-left: 24px;
        }
        .financial-table th:last-child {
          padding-right: 24px;
          text-align: right;
        }
        .financial-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          background: white;
        }
        .financial-table tbody tr:last-child {
          border-bottom: none;
        }
        .financial-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }
        .financial-table td {
          padding: 20px;
          font-size: 15px;
          color: #334155;
          font-weight: 500;
        }
        .financial-table td:first-child {
          padding-left: 24px;
          font-weight: 600;
        }
        .financial-table td:last-child {
          padding-right: 24px;
          font-weight: 700;
          color: #0066CC;
          text-align: right;
          font-size: 16px;
        }
        /* Insight boxes, alert items, and footer now use inline styles for better PDF compatibility */
        .footer-text {
          margin-bottom: 8px;
          color: #64748B;
          font-size: 14px;
          font-weight: 500;
        }
        @media print {
          body {
            padding: 0;
            background: white;
          }
          .page {
            box-shadow: none;
            padding: 0;
          }
          .cover-page {
            padding: 60px 48px;
          }
          .content-section {
            padding: 48px;
          }
          .header {
            padding: 40px 48px;
          }
          .footer {
            padding: 40px 48px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Top Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: #8B0000;"></div>
        
        <!-- Cover Page -->
        <div class="cover-page" style="background-color: #ffffff; padding: 80px 60px;">
          <div class="cover-logo">
            ${logoHtml || `<div style="font-size: 48px; font-weight: 800; color: #0066CC; display: inline-block; width: 100px; height: 100px; line-height: 100px; text-align: center; background-color: #f0f0f0; border-radius: 50%;">${business.name.charAt(0).toUpperCase()}</div>`}
          </div>
          <div class="cover-title" style="color: #0066CC; font-size: 56px; font-weight: 900; margin-bottom: 24px;">BUSINESS PLAN</div>
          <div class="cover-subtitle" style="color: #1e293b; font-size: 28px; font-weight: 700; margin-bottom: 48px;">${business.name}</div>
          <div class="cover-info" style="color: #475569; font-size: 17px; line-height: 2.2;">
            <div><strong style="color: #1a1a1a;">Owner:</strong> ${business.owner}</div>
            <div><strong style="color: #1a1a1a;">Location:</strong> ${business.location}, Zimbabwe</div>
            <div><strong style="color: #1a1a1a;">Industry:</strong> ${business.type.charAt(0).toUpperCase() + business.type.slice(1)}</div>
            <div><strong style="color: #1a1a1a;">Stage:</strong> ${business.stage.charAt(0).toUpperCase() + business.stage.slice(1)}</div>
          </div>
          <div class="cover-date" style="margin-top: 80px; font-size: 14px; color: #94a3b8; font-weight: 500;">
            Generated on ${formatDate(new Date().toISOString())}
          </div>
        </div>
        
        <!-- Bottom Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: #8B0000;"></div>

        <!-- Executive Summary -->
        <div class="section">
          <div class="section-title">1. EXECUTIVE SUMMARY</div>
          <div class="section-content">
            <p><strong>${business.name}</strong> is a ${business.stage} ${business.type} business operating in ${business.location}, Zimbabwe. Founded and managed by ${business.owner}, the business is positioned to capitalize on market opportunities while maintaining financial discipline and operational excellence.</p>
            
            <div class="highlight-box" style="background-color: #EFF6FF; border-left: 5px solid #0066CC; padding: 28px; margin: 28px 0; border-radius: 5px;">
              <strong style="color: #0066CC; font-size: 17px; font-weight: 800;">Key Highlights:</strong>
              <ul style="margin-top: 12px; color: #333333;">
                <li>Current monthly revenue: <strong>${formatCurrency(metrics.monthSales)}</strong></li>
                <li>Monthly profit margin: <strong>${formatPercent(profitMargin)}</strong></li>
                <li>Cash position: <strong>${formatCurrency(metrics.cashPosition)}</strong> ${cashGrowth > 0 ? `(${formatPercent(cashGrowthPercent)} growth from initial capital)` : ''}</li>
                <li>Business stage: <strong>${business.stage.charAt(0).toUpperCase() + business.stage.slice(1)}</strong> - ${stageInsights.focus}</li>
              </ul>
            </div>

            <p><strong>Mission Statement:</strong><br>
            To deliver exceptional value to our customers through quality ${business.type} services/products, while building a sustainable and profitable business that contributes positively to the ${business.location} community and creates opportunities for growth and development.</p>

            <p><strong>Vision:</strong><br>
            To become a recognized leader in the ${business.type} sector in ${business.location}, known for innovation, customer satisfaction, and sustainable business practices that drive long-term value for all stakeholders.</p>
          </div>
        </div>

        <!-- Company Description -->
        <div class="section">
          <div class="section-title">2. COMPANY DESCRIPTION</div>
          <div class="section-content">
            <div class="section-subtitle">2.1 Business Overview</div>
            <p><strong>${business.name}</strong> operates as a ${business.type} business in ${business.location}, Zimbabwe. The business was established with an initial capital investment of ${formatCurrency(business.capital)} and is currently in the ${business.stage} stage of development.</p>

            <div class="section-subtitle">2.2 Legal Structure & Ownership</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Business Name</div>
                <div class="info-value">${business.name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Owner/Founder</div>
                <div class="info-value">${business.owner}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Location</div>
                <div class="info-value">${business.location}, Zimbabwe</div>
              </div>
              <div class="info-item">
                <div class="info-label">Currency</div>
                <div class="info-value">${business.currency}</div>
              </div>
            </div>

            <div class="section-subtitle">2.3 Business Stage & Development</div>
            <p>The business is currently in the <strong>${business.stage}</strong> stage, which means:</p>
            <ul>
              <li><strong>Primary Focus:</strong> ${stageInsights.focus}</li>
              <li><strong>Key Priorities:</strong> ${stageInsights.priorities.join(', ')}</li>
              <li><strong>Timeline:</strong> ${stageInsights.timeline}</li>
            </ul>
          </div>
        </div>

        <!-- Market Analysis -->
        <div class="section">
          <div class="section-title">3. MARKET ANALYSIS</div>
          <div class="section-content">
            <div class="section-subtitle">3.1 Industry Overview</div>
            <p>${industryInsights.market}</p>

            <div class="section-subtitle">3.2 Target Market</div>
            <p>Our primary target market consists of:</p>
            <ul>
              <li><strong>Geographic Focus:</strong> ${business.location} and surrounding areas</li>
              <li><strong>Market Segment:</strong> Customers seeking quality ${business.type} products/services</li>
              <li><strong>Customer Profile:</strong> Value-conscious consumers and businesses looking for reliable service and competitive pricing</li>
            </ul>

            <div class="section-subtitle">3.3 Competitive Analysis</div>
            <p>The ${business.type} sector in ${business.location} presents both opportunities and challenges:</p>
            <div class="info-grid">
              <div class="metric-card">
                <div class="metric-label">Market Opportunities</div>
                <ul style="margin-top: 12px; font-size: 14px;">
                  ${industryInsights.opportunities.map(opp => `<li>${opp}</li>`).join('')}
                </ul>
              </div>
              <div class="metric-card">
                <div class="metric-label">Market Challenges</div>
                <ul style="margin-top: 12px; font-size: 14px;">
                  ${industryInsights.challenges.map(ch => `<li>${ch}</li>`).join('')}
                </ul>
              </div>
            </div>

            <div class="section-subtitle">3.4 Competitive Advantages</div>
            <p>Our competitive positioning is built on:</p>
            <ul>
              <li><strong>Quality Focus:</strong> Commitment to delivering superior products/services</li>
              <li><strong>Customer Relationships:</strong> Building long-term partnerships with our clients</li>
              <li><strong>Financial Discipline:</strong> Efficient operations and cost management</li>
              <li><strong>Local Presence:</strong> Deep understanding of the ${business.location} market</li>
            </ul>
          </div>
        </div>

        <!-- Financial Analysis -->
        <div class="section">
          <div class="section-title">4. FINANCIAL ANALYSIS</div>
          <div class="section-content">
            <div class="section-subtitle">4.1 Current Financial Position</div>
            
            <div class="info-grid">
              <div class="metric-card">
                <div class="metric-label">Monthly Revenue</div>
                <div class="metric-value">${formatCurrency(metrics.monthSales)}</div>
                <div class="metric-change ${isProfitable ? 'positive' : 'negative'}">
                  ${isProfitable ? '✓ Profitable Operations' : '⚠ Needs Attention'}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Monthly Expenses</div>
                <div class="metric-value">${formatCurrency(metrics.monthExpenses)}</div>
                <div class="metric-change">
                  ${expenseRatio.toFixed(1)}% of revenue
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Monthly Profit</div>
                <div class="metric-value">${formatCurrency(metrics.monthProfit)}</div>
                <div class="metric-change ${isProfitable ? 'positive' : 'negative'}">
                  ${formatPercent(profitMargin)} margin
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Cash Position</div>
                <div class="metric-value">${formatCurrency(metrics.cashPosition)}</div>
                <div class="metric-change ${hasPositiveCashFlow ? 'positive' : 'negative'}">
                  ${hasPositiveCashFlow ? `+${formatCurrency(cashGrowth)} growth` : 'Below initial capital'}
                </div>
              </div>
            </div>

            <div class="section-subtitle">4.2 Financial Performance Analysis</div>
            <table class="financial-table">
              <thead style="background-color: #0066CC; color: #ffffff;">
                <tr>
                  <th style="background-color: #0066CC; color: #ffffff; padding: 20px; text-align: left; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Financial Metric</th>
                  <th style="background-color: #0066CC; color: #ffffff; padding: 20px; text-align: right; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Initial Capital Investment</td>
                  <td>${formatCurrency(business.capital)}</td>
                </tr>
                <tr>
                  <td>Current Cash Position</td>
                  <td>${formatCurrency(metrics.cashPosition)}</td>
                </tr>
                <tr>
                  <td>Cash Growth</td>
                  <td>${formatCurrency(cashGrowth)} (${formatPercent(cashGrowthPercent)})</td>
                </tr>
                <tr>
                  <td>Monthly Revenue</td>
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
                  <td>Profit Margin</td>
                  <td>${formatPercent(profitMargin)}</td>
                </tr>
                <tr>
                  <td>Expense Ratio</td>
                  <td>${expenseRatio.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>

            ${metrics.topCategories && metrics.topCategories.length > 0 ? `
            <div class="section-subtitle">4.3 Revenue Sources</div>
            <p>Current revenue is generated from the following categories:</p>
            <table class="financial-table">
              <thead style="background-color: #0066CC; color: #ffffff;">
                <tr>
                  <th style="background-color: #0066CC; color: #ffffff; padding: 20px; text-align: left; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Category</th>
                  <th style="background-color: #0066CC; color: #ffffff; padding: 20px; text-align: right; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Monthly Revenue</th>
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

            <div class="insight-box" style="background-color: #fffbeb; border-left: 5px solid #f59e0b; padding: 28px; margin: 28px 0; border-radius: 5px;">
              <div class="insight-title" style="font-weight: 800; color: #92400E; margin-bottom: 12px; font-size: 17px;">Financial Health Assessment</div>
              <div class="insight-content" style="color: #78350F; line-height: 1.9; font-weight: 500;">
                ${isProfitable 
                  ? `<p><strong>✓ Positive Performance:</strong> The business is generating profit with a ${formatPercent(profitMargin)} margin. This indicates healthy operations and good cost management.</p>`
                  : `<p><strong>⚠ Attention Required:</strong> The business is currently operating at a loss. Focus on increasing revenue or reducing expenses to achieve profitability.</p>`
                }
                ${hasPositiveCashFlow 
                  ? `<p><strong>✓ Strong Cash Position:</strong> Cash position has grown by ${formatPercent(cashGrowthPercent)} from initial capital, demonstrating effective cash management.</p>`
                  : `<p><strong>⚠ Cash Flow Concern:</strong> Current cash position is below initial capital. Review expenses and revenue streams to improve cash flow.</p>`
                }
                ${expenseRatio < 80 
                  ? `<p><strong>✓ Efficient Operations:</strong> Expenses represent ${expenseRatio.toFixed(1)}% of revenue, indicating good cost control.</p>`
                  : `<p><strong>⚠ High Expense Ratio:</strong> Expenses represent ${expenseRatio.toFixed(1)}% of revenue. Consider cost optimization strategies.</p>`
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Operations Plan -->
        <div class="section">
          <div class="section-title">5. OPERATIONS PLAN</div>
          <div class="section-content">
            <div class="section-subtitle">5.1 Operational Structure</div>
            <p>Our operations are designed to deliver consistent quality while maintaining efficiency and cost-effectiveness.</p>

            <div class="section-subtitle">5.2 Key Operational Activities</div>
            <ul>
              <li><strong>Customer Service:</strong> Maintaining high standards of customer interaction and satisfaction</li>
              <li><strong>Sales & Marketing:</strong> Active engagement with target market through multiple channels</li>
              <li><strong>Financial Management:</strong> Careful tracking of revenue, expenses, and cash flow</li>
              <li><strong>Quality Control:</strong> Ensuring consistent delivery of products/services</li>
              <li><strong>Record Keeping:</strong> Maintaining accurate financial and operational records</li>
            </ul>

            <div class="section-subtitle">5.3 Operational Efficiency</div>
            <p>Current operational metrics indicate:</p>
            <ul>
              <li>Expense management: ${expenseRatio < 80 ? 'Efficient' : 'Needs optimization'} (${expenseRatio.toFixed(1)}% of revenue)</li>
              <li>Profitability: ${isProfitable ? 'Achieved' : 'Target to achieve'}</li>
              <li>Cash management: ${hasPositiveCashFlow ? 'Positive growth' : 'Requires attention'}</li>
            </ul>
          </div>
        </div>

        <!-- Marketing Strategy -->
        <div class="section">
          <div class="section-title">6. MARKETING & SALES STRATEGY</div>
          <div class="section-content">
            <div class="section-subtitle">6.1 Marketing Channels</div>
            <p>Our marketing strategy focuses on multiple channels to reach our target market:</p>
            <ul>
              <li><strong>Local Presence:</strong> Building strong relationships within the ${business.location} community</li>
              <li><strong>Word of Mouth:</strong> Leveraging satisfied customers as brand ambassadors</li>
              <li><strong>Digital Marketing:</strong> Utilizing online platforms and social media</li>
              <li><strong>Partnerships:</strong> Collaborating with complementary businesses</li>
            </ul>

            <div class="section-subtitle">6.2 Sales Strategy</div>
            <p>Our sales approach emphasizes:</p>
            <ul>
              <li><strong>Value Proposition:</strong> Delivering quality at competitive prices</li>
              <li><strong>Customer Relationships:</strong> Building long-term partnerships</li>
              <li><strong>Flexible Solutions:</strong> Adapting to customer needs</li>
              <li><strong>Service Excellence:</strong> Ensuring customer satisfaction</li>
            </ul>

            <div class="section-subtitle">6.3 Pricing Strategy</div>
            <p>Our pricing is designed to:</p>
            <ul>
              <li>Remain competitive in the ${business.location} market</li>
              <li>Reflect the value and quality of our offerings</li>
              <li>Maintain profitability while ensuring accessibility</li>
              <li>Adapt to market conditions and customer feedback</li>
            </ul>
          </div>
        </div>

        <!-- Growth Strategy -->
        <div class="section">
          <div class="section-title">7. GROWTH STRATEGY</div>
          <div class="section-content">
            <div class="section-subtitle">7.1 Short-term Goals (6-12 months)</div>
            <p>Our immediate priorities focus on:</p>
            <ul>
              <li><strong>Revenue Growth:</strong> Target ${formatPercent(20)} increase in monthly revenue</li>
              <li><strong>Profitability:</strong> ${isProfitable ? 'Maintain and improve' : 'Achieve'} positive profit margins</li>
              <li><strong>Customer Base:</strong> Expand customer acquisition and retention</li>
              <li><strong>Operational Efficiency:</strong> Optimize processes to reduce costs</li>
              <li><strong>Cash Flow:</strong> Maintain positive cash flow and build reserves</li>
            </ul>

            <div class="section-subtitle">7.2 Medium-term Goals (1-3 years)</div>
            <p>Our growth trajectory includes:</p>
            <ul>
              <li><strong>Market Expansion:</strong> Explore opportunities in adjacent markets or locations</li>
              <li><strong>Product/Service Development:</strong> ${industryInsights.opportunities[0]}</li>
              <li><strong>Operational Scaling:</strong> Build systems and processes for growth</li>
              <li><strong>Brand Building:</strong> Establish strong brand recognition in ${business.location}</li>
              <li><strong>Sustainable Profitability:</strong> Achieve consistent profit margins</li>
            </ul>

            <div class="section-subtitle">7.3 Long-term Vision (3+ years)</div>
            <p>Our long-term aspirations include:</p>
            <ul>
              <li>Becoming a recognized leader in the ${business.type} sector</li>
              <li>Expanding operations while maintaining quality and values</li>
              <li>Creating employment opportunities and community impact</li>
              <li>Building a sustainable, profitable enterprise</li>
            </ul>
          </div>
        </div>

        <!-- Risk Management -->
        <div class="section">
          <div class="section-title">8. RISK MANAGEMENT</div>
          <div class="section-content">
            <div class="section-subtitle">8.1 Identified Risks</div>
            <p>Key risks facing the business include:</p>
            <ul>
              <li><strong>Economic Volatility:</strong> Fluctuations in the Zimbabwean economy and currency</li>
              <li><strong>Market Competition:</strong> Competitive pressure in the ${business.type} sector</li>
              <li><strong>Cash Flow:</strong> ${hasPositiveCashFlow ? 'Currently managed' : 'Requires attention'}</li>
              <li><strong>Operational:</strong> ${industryInsights.challenges.join(', ')}</li>
            </ul>

            <div class="section-subtitle">8.2 Risk Mitigation Strategies</div>
            <p>Our approach to managing risks includes:</p>
            <ul>
              <li><strong>Financial Discipline:</strong> Maintaining cash reserves and careful expense management</li>
              <li><strong>Diversification:</strong> ${metrics.topCategories && metrics.topCategories.length > 1 ? 'Multiple revenue streams' : 'Exploring additional revenue sources'}</li>
              <li><strong>Market Monitoring:</strong> Staying informed about market trends and competition</li>
              <li><strong>Operational Flexibility:</strong> Ability to adapt to changing conditions</li>
              <li><strong>Strong Relationships:</strong> Building partnerships with suppliers and customers</li>
            </ul>
          </div>
        </div>

        <!-- Action Items & Alerts -->
        ${metrics.alerts && metrics.alerts.length > 0 ? `
        <div class="section">
          <div class="section-title">9. CURRENT ALERTS & ACTION ITEMS</div>
          <div class="section-content">
            <p>The following items require attention to ensure continued business success:</p>
            ${metrics.alerts.map((alert: any, index: number) => `
              <div class="alert-item">
                <div class="alert-message">${index + 1}. ${alert.message}</div>
                ${alert.action ? `<div class="alert-action">Recommended Action: ${alert.action}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Conclusion -->
        <div class="section">
          <div class="section-title">${metrics.alerts && metrics.alerts.length > 0 ? '10. CONCLUSION' : '9. CONCLUSION'}</div>
          <div class="section-content">
            <p><strong>${business.name}</strong> is positioned for growth in the ${business.location} market. With a focus on quality, customer service, and financial discipline, the business aims to build a sustainable and profitable enterprise that serves the community while creating value for all stakeholders.</p>

            <p>This business plan reflects the current state of operations and provides a roadmap for future development. It will be reviewed and updated quarterly to reflect changing market conditions, business performance, and strategic priorities.</p>

            <div class="highlight-box" style="background-color: #EFF6FF; border-left: 5px solid #0066CC; padding: 28px; margin: 28px 0; border-radius: 5px;">
              <strong style="color: #0066CC; font-size: 17px; font-weight: 800;">Key Success Factors:</strong>
              <ul style="margin-top: 12px; color: #333333;">
                <li>Maintaining financial discipline and positive cash flow</li>
                <li>Delivering consistent quality to customers</li>
                <li>Adapting to market opportunities and challenges</li>
                <li>Building strong relationships with customers and partners</li>
                <li>Continuous improvement in operations and efficiency</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer" style="margin-top: 80px; padding: 48px 56px; background-color: #f8fafc; border-top: 3px solid #e2e8f0; text-align: center;">
          <div class="footer-text" style="margin-bottom: 8px; color: #64748B; font-size: 14px; font-weight: 500;"><strong>Generated by DreamBig Business OS</strong></div>
          <div class="footer-text" style="margin-bottom: 8px; color: #64748B; font-size: 14px; font-weight: 500;">Comprehensive Business Management Platform</div>
          <div class="footer-text" style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
            Generated on ${formatDate(new Date().toISOString())} | ${business.name} | ${business.location}, Zimbabwe
          </div>
        </div>
        
        <!-- Bottom Accent Bar -->
        <div style="width: 100%; height: 10px; background-color: #8B0000;"></div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export async function exportBusinessPlanToPDF(
  business: BusinessProfile,
  metrics: BusinessPlanMetrics,
  extendedData?: Partial<ExtendedBusinessPlanData>
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
    const { Platform } = await import('react-native');
    
    const html = generateBusinessPlanPDF(business, metrics, extendedData);
    
    // Validate HTML before attempting to generate PDF
    if (!html || html.trim().length === 0) {
      throw new Error('Failed to generate PDF content');
    }

    console.log('Generating Business Plan PDF with HTML length:', html.length);
    
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
          link.download = `${business.name.replace(/[^a-z0-9]/gi, '_')}-Business-Plan.html`;
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
            'Business Plan Exported',
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
            const filename = `${FileSystem.documentDirectory}${business.name.replace(/[^a-z0-9]/gi, '_')}-Business-Plan.pdf`;
            
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

      console.log('Business Plan PDF generated successfully at:', uri);
    
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
    throw new Error(error.message || 'Failed to export PDF. Please ensure expo-print is installed and try again.');
  }
}
