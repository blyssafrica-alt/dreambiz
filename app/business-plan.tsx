import { Stack } from 'expo-router';
import { FileText, Download } from 'lucide-react-native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert as RNAlert,
  Platform,
  Share,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';

export default function BusinessPlanScreen() {
  const { business, getDashboardMetrics } = useBusiness();
  const metrics = getDashboardMetrics();

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const generateBusinessPlan = () => {
    if (!business) return '';

    let plan = `BUSINESS PLAN\n${'='.repeat(60)}\n\n`;
    
    plan += `1. EXECUTIVE SUMMARY\n${'-'.repeat(60)}\n\n`;
    plan += `Business Name: ${business.name}\n`;
    plan += `Owner: ${business.owner}\n`;
    plan += `Industry: ${business.type.charAt(0).toUpperCase() + business.type.slice(1)}\n`;
    plan += `Location: ${business.location}\n`;
    plan += `Stage: ${business.stage.charAt(0).toUpperCase() + business.stage.slice(1)}\n`;
    if (business.phone) plan += `Contact: ${business.phone}\n`;
    plan += `\n`;

    plan += `2. BUSINESS DESCRIPTION\n${'-'.repeat(60)}\n\n`;
    plan += `${business.name} is a ${business.type} business based in ${business.location}, Zimbabwe. `;
    plan += `The business is currently in the ${business.stage} stage of operations.\n\n`;

    plan += `Mission:\n`;
    plan += `To provide quality products/services to our customers while maintaining profitable operations and sustainable growth.\n\n`;

    plan += `3. MARKET ANALYSIS\n${'-'.repeat(60)}\n\n`;
    plan += `Target Market:\n`;
    plan += `- Local customers in ${business.location}\n`;
    plan += `- Growing demand for ${business.type} services/products\n`;
    plan += `- Competitive pricing strategy\n\n`;

    plan += `Competition:\n`;
    plan += `- Analysis of local competitors\n`;
    plan += `- Differentiation through quality and service\n`;
    plan += `- Focus on customer relationships\n\n`;

    plan += `4. FINANCIAL PLAN\n${'-'.repeat(60)}\n\n`;
    plan += `Starting Capital: ${formatCurrency(business.capital)}\n`;
    plan += `Currency: ${business.currency}\n\n`;

    plan += `Current Financial Position:\n`;
    plan += `- Monthly Sales: ${formatCurrency(metrics.monthSales)}\n`;
    plan += `- Monthly Expenses: ${formatCurrency(metrics.monthExpenses)}\n`;
    plan += `- Monthly Profit: ${formatCurrency(metrics.monthProfit)}\n`;
    plan += `- Cash Position: ${formatCurrency(metrics.cashPosition)}\n\n`;

    if (metrics.topCategories.length > 0) {
      plan += `Revenue Sources:\n`;
      metrics.topCategories.forEach((cat, index) => {
        plan += `${index + 1}. ${cat.category}: ${formatCurrency(cat.amount)}\n`;
      });
      plan += `\n`;
    }

    plan += `5. OPERATIONS PLAN\n${'-'.repeat(60)}\n\n`;
    plan += `Daily Operations:\n`;
    plan += `- Customer service and sales\n`;
    plan += `- Inventory management\n`;
    plan += `- Financial record keeping\n`;
    plan += `- Quality control\n\n`;

    plan += `Key Activities:\n`;
    plan += `- Product/service delivery\n`;
    plan += `- Marketing and promotion\n`;
    plan += `- Customer relationship management\n`;
    plan += `- Supplier coordination\n\n`;

    plan += `6. MARKETING STRATEGY\n${'-'.repeat(60)}\n\n`;
    plan += `Marketing Channels:\n`;
    plan += `- Word of mouth and referrals\n`;
    plan += `- Local advertising\n`;
    plan += `- Social media presence\n`;
    plan += `- Community engagement\n\n`;

    plan += `Pricing Strategy:\n`;
    plan += `- Competitive market pricing\n`;
    plan += `- Value-based pricing for premium services\n`;
    plan += `- Flexible payment terms when appropriate\n\n`;

    plan += `7. GROWTH STRATEGY\n${'-'.repeat(60)}\n\n`;
    plan += `Short-term Goals (6-12 months):\n`;
    plan += `- Increase monthly revenue by 20%\n`;
    plan += `- Build customer base\n`;
    plan += `- Improve operational efficiency\n`;
    plan += `- Maintain positive cash flow\n\n`;

    plan += `Long-term Goals (1-3 years):\n`;
    plan += `- Expand product/service offerings\n`;
    plan += `- Consider additional locations\n`;
    plan += `- Build brand recognition\n`;
    plan += `- Achieve sustainable profitability\n\n`;

    plan += `8. RISK MANAGEMENT\n${'-'.repeat(60)}\n\n`;
    plan += `Identified Risks:\n`;
    plan += `- Economic fluctuations and inflation\n`;
    plan += `- Currency volatility (USD/ZWL)\n`;
    plan += `- Competition\n`;
    plan += `- Supply chain disruptions\n\n`;

    plan += `Risk Mitigation:\n`;
    plan += `- Maintain cash reserves\n`;
    plan += `- Diversify revenue streams\n`;
    plan += `- Build strong supplier relationships\n`;
    plan += `- Regular financial monitoring\n\n`;

    plan += `9. SUCCESS METRICS\n${'-'.repeat(60)}\n\n`;
    plan += `Key Performance Indicators:\n`;
    plan += `- Monthly revenue growth\n`;
    plan += `- Profit margins\n`;
    plan += `- Customer retention rate\n`;
    plan += `- Cash flow positivity\n`;
    plan += `- Break-even achievement\n\n`;

    if (metrics.alerts.length > 0) {
      plan += `10. CURRENT ALERTS & ACTION ITEMS\n${'-'.repeat(60)}\n\n`;
      metrics.alerts.forEach((alert, index) => {
        plan += `${index + 1}. ${alert.message}\n`;
        if (alert.action) {
          plan += `   Action: ${alert.action}\n`;
        }
      });
      plan += `\n`;
    }

    plan += `CONCLUSION\n${'-'.repeat(60)}\n\n`;
    plan += `${business.name} is positioned for growth in the ${business.location} market. `;
    plan += `With a focus on quality, customer service, and financial discipline, `;
    plan += `we aim to build a sustainable and profitable business that serves our community.\n\n`;

    plan += `This plan will be reviewed and updated quarterly to reflect `;
    plan += `changing market conditions and business performance.\n\n`;

    plan += `Generated by DreamBig Business OS\n`;
    plan += `Date: ${new Date().toLocaleDateString('en-ZW', { month: 'long', day: 'numeric', year: 'numeric' })}\n`;

    return plan;
  };

  const handleShare = async () => {
    const plan = generateBusinessPlan();
    
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([plan], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc) throw new Error('Document not available');
        const a = doc.createElement('a');
        a.href = url;
        a.download = `${business?.name}-Business-Plan.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: plan,
          title: `${business?.name} - Business Plan`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      RNAlert.alert('Error', 'Failed to share business plan');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Business Plan',
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={{ marginRight: 16 }}>
              <Download size={22} color="#0066CC" />
            </TouchableOpacity>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <FileText size={48} color="#0066CC" />
          <Text style={styles.title}>Business Plan Generator</Text>
          <Text style={styles.subtitle}>
            A comprehensive business plan based on your data
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            This business plan is automatically generated using your business profile and financial data. 
            It provides a structured overview suitable for:
          </Text>
          <Text style={styles.bulletPoint}>• Applying for funding</Text>
          <Text style={styles.bulletPoint}>• Sharing with partners</Text>
          <Text style={styles.bulletPoint}>• Strategic planning</Text>
          <Text style={styles.bulletPoint}>• Tracking progress</Text>
        </View>

        <View style={styles.sectionsCard}>
          <Text style={styles.sectionsTitle}>Plan Includes:</Text>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>1</Text>
            <Text style={styles.sectionText}>Executive Summary</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionText}>Business Description</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>3</Text>
            <Text style={styles.sectionText}>Market Analysis</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>4</Text>
            <Text style={styles.sectionText}>Financial Plan</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>5</Text>
            <Text style={styles.sectionText}>Operations Plan</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>6</Text>
            <Text style={styles.sectionText}>Marketing Strategy</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>7</Text>
            <Text style={styles.sectionText}>Growth Strategy</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>8</Text>
            <Text style={styles.sectionText}>Risk Management</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionNumber}>9</Text>
            <Text style={styles.sectionText}>Success Metrics</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.generateButton} onPress={handleShare}>
          <Download size={20} color="#FFF" />
          <Text style={styles.generateButtonText}>Download Business Plan</Text>
        </TouchableOpacity>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📝 Note</Text>
          <Text style={styles.noteText}>
            Update your business profile and keep your financial records current to ensure 
            your business plan reflects accurate information.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600' as const,
    marginLeft: 8,
    marginBottom: 4,
  },
  sectionsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  sectionsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 16,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 28,
  },
  sectionText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066CC',
    marginBottom: 16,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  noteCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
});
