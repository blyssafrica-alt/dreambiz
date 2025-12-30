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
          line-height: 1.7;
        }
        .page {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 50px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .cover-page {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100%;
          text-align: center;
          border-bottom: 4px solid #0066CC;
          padding-bottom: 40px;
          margin-bottom: 40px;
        }
        .cover-logo {
          margin-bottom: 30px;
        }
        .cover-logo img {
          max-height: 120px;
          max-width: 300px;
        }
        .cover-title {
          font-size: 42px;
          font-weight: 800;
          color: #0066CC;
          margin-bottom: 20px;
          line-height: 1.2;
        }
        .cover-subtitle {
          font-size: 24px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 40px;
        }
        .cover-info {
          font-size: 16px;
          color: #475569;
          line-height: 2;
        }
        .cover-date {
          margin-top: 60px;
          font-size: 14px;
          color: #94a3b8;
        }
        .header {
          background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
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
          background: white;
          padding: 10px;
          border-radius: 8px;
        }
        .business-info {
          flex: 1;
          text-align: right;
        }
        .business-name {
          font-size: 28px;
          font-weight: 800;
          color: white;
          margin-bottom: 8px;
        }
        .document-type {
          font-size: 20px;
          font-weight: 600;
          color: rgba(255,255,255,0.95);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content-section {
          padding: 0;
        }
        .section {
          margin-bottom: 50px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 28px;
          font-weight: 800;
          color: #0066CC;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 4px solid #0066CC;
        }
        .section-subtitle {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .section-content {
          font-size: 15px;
          color: #334155;
          line-height: 1.8;
        }
        .section-content p {
          margin-bottom: 16px;
          text-align: justify;
        }
        .section-content ul, .section-content ol {
          margin-left: 24px;
          margin-bottom: 16px;
        }
        .section-content li {
          margin-bottom: 10px;
        }
        .highlight-box {
          background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
          border-left: 5px solid #0066CC;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .highlight-box strong {
          color: #0066CC;
          font-size: 16px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .info-item {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          border-left: 4px solid #0066CC;
        }
        .info-label {
          font-size: 11px;
          font-weight: 700;
          color: #0066CC;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .info-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }
        .metric-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .metric-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .metric-value {
          font-size: 32px;
          font-weight: 800;
          color: #0066CC;
          margin-bottom: 8px;
        }
        .metric-change {
          font-size: 14px;
          font-weight: 600;
        }
        .metric-change.positive {
          color: #10B981;
        }
        .metric-change.negative {
          color: #EF4444;
        }
        .financial-table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
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
          font-weight: 700;
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
        .financial-table tbody tr:hover {
          background: #f8f9fa;
        }
        .financial-table td {
          padding: 16px;
          font-size: 15px;
          color: #334155;
        }
        .financial-table td:last-child {
          font-weight: 700;
          color: #0066CC;
          text-align: right;
        }
        .insight-box {
          background: #fff9e6;
          border-left: 5px solid #f59e0b;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .insight-title {
          font-weight: 700;
          color: #92400E;
          margin-bottom: 8px;
          font-size: 16px;
        }
        .insight-content {
          color: #78350F;
          line-height: 1.8;
        }
        .alert-item {
          background: #fef2f2;
          border-left: 5px solid #EF4444;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .alert-message {
          font-weight: 600;
          color: #991B1B;
          margin-bottom: 4px;
        }
        .alert-action {
          font-size: 13px;
          color: #B91C1C;
        }
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 3px solid #e2e8f0;
          text-align: center;
          color: #64748B;
          font-size: 12px;
        }
        .footer-text {
          margin-bottom: 6px;
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
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Cover Page -->
        <div class="cover-page">
          <div class="cover-logo">
            ${logoHtml || `<div style="font-size: 48px; font-weight: 800; color: #0066CC;">${business.name.charAt(0)}</div>`}
          </div>
          <div class="cover-title">BUSINESS PLAN</div>
          <div class="cover-subtitle">${business.name}</div>
          <div class="cover-info">
            <div><strong>Owner:</strong> ${business.owner}</div>
            <div><strong>Location:</strong> ${business.location}, Zimbabwe</div>
            <div><strong>Industry:</strong> ${business.type.charAt(0).toUpperCase() + business.type.slice(1)}</div>
            <div><strong>Stage:</strong> ${business.stage.charAt(0).toUpperCase() + business.stage.slice(1)}</div>
          </div>
          <div class="cover-date">
            Generated on ${formatDate(new Date().toISOString())}
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="section">
          <div class="section-title">1. EXECUTIVE SUMMARY</div>
          <div class="section-content">
            <p><strong>${business.name}</strong> is a ${business.stage} ${business.type} business operating in ${business.location}, Zimbabwe. Founded and managed by ${business.owner}, the business is positioned to capitalize on market opportunities while maintaining financial discipline and operational excellence.</p>
            
            <div class="highlight-box">
              <strong>Key Highlights:</strong>
              <ul style="margin-top: 12px;">
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
              <thead>
                <tr>
                  <th>Financial Metric</th>
                  <th>Value</th>
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
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Monthly Revenue</th>
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

            <div class="insight-box">
              <div class="insight-title">Financial Health Assessment</div>
              <div class="insight-content">
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

            <div class="highlight-box">
              <strong>Key Success Factors:</strong>
              <ul style="margin-top: 12px;">
                <li>Maintaining financial discipline and positive cash flow</li>
                <li>Delivering consistent quality to customers</li>
                <li>Adapting to market opportunities and challenges</li>
                <li>Building strong relationships with customers and partners</li>
                <li>Continuous improvement in operations and efficiency</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-text"><strong>Generated by DreamBig Business OS</strong></div>
          <div class="footer-text">Comprehensive Business Management Platform</div>
          <div class="footer-text" style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
            Generated on ${formatDate(new Date().toISOString())} | ${business.name} | ${business.location}, Zimbabwe
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
  metrics: BusinessPlanMetrics,
  extendedData?: Partial<ExtendedBusinessPlanData>
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    
    const html = generateBusinessPlanPDF(business, metrics, extendedData);
    
    const result = await (Print as any).printToFileAsync({
      html,
      base64: false,
      width: 612, // A4 width in points
      height: 792, // A4 height in points
    });
    
    // Check if result exists and has uri property
    if (!result || !result.uri) {
      throw new Error('PDF generation failed: No file URI returned');
    }
    
    const { uri } = result;
    
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
    throw new Error(error.message || 'Failed to export PDF. Please ensure expo-print is installed and try again.');
  }
}
