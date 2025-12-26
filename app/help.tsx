import { Stack, router } from 'expo-router';
import { HelpCircle, Book, Mail, MessageCircle, X, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const FAQ_ITEMS = [
  {
    id: 'getting-started',
    question: 'How do I get started?',
    answer: 'After signing in, complete the onboarding wizard to set up your business profile. Select your DreamBig book, business type, and enter your financial information. The app will then unlock features based on your book selection.',
  },
  {
    id: 'documents',
    question: 'How do I create invoices and receipts?',
    answer: 'Go to the Documents tab and tap the + button. Select the document type (Invoice, Receipt, Quotation, etc.), fill in customer details, add items, and save. Documents are automatically numbered and can be exported as PDF.',
  },
  {
    id: 'budgets',
    question: 'How do I create a budget?',
    answer: 'Go to the Budgets tab and tap the + button. You can create a custom budget or use a template based on your business type. Set your total budget, dates, and optionally add category budgets.',
  },
  {
    id: 'products',
    question: 'How do I manage inventory?',
    answer: 'Go to the Products tab to add, edit, or delete products. Track stock levels, set prices, and view low stock alerts. The app will warn you when products are running low.',
  },
  {
    id: 'reports',
    question: 'How do I view my financial reports?',
    answer: 'Go to the Reports tab to see profit & loss statements, sales trends, expense breakdowns, and more. You can filter by date range and export reports.',
  },
  {
    id: 'book-features',
    question: 'Why are some features hidden?',
    answer: 'Features are unlocked based on your selected DreamBig book. Each book provides access to specific tools and templates. To access all features, select the appropriate book during onboarding.',
  },
];

const SUPPORT_OPTIONS = [
  {
    id: 'email',
    title: 'Email Support',
    description: 'Send us an email for assistance',
    icon: Mail,
    action: () => Linking.openURL('mailto:support@dreambig.co.zw'),
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Support',
    description: 'Chat with us on WhatsApp',
    icon: MessageCircle,
    action: () => Linking.openURL('https://wa.me/263771234567'),
  },
  {
    id: 'books',
    title: 'DreamBig Books',
    description: 'Learn more about our books',
    icon: Book,
    action: () => Linking.openURL('https://dreambig.co.zw/books'),
  },
];

export default function HelpScreen() {
  const { theme } = useTheme();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Help & Support', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Help & Support</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={theme.text.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Support Options */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Get Support</Text>
          {SUPPORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.supportOption, { backgroundColor: theme.background.secondary }]}
              onPress={option.action}
            >
              <View style={styles.supportOptionLeft}>
                <View style={[styles.supportIcon, { backgroundColor: `${theme.accent.primary}20` }]}>
                  <option.icon size={20} color={theme.accent.primary} />
                </View>
                <View style={styles.supportOptionInfo}>
                  <Text style={[styles.supportOptionTitle, { color: theme.text.primary }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.supportOptionDesc, { color: theme.text.secondary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Frequently Asked Questions</Text>
          </View>
          {FAQ_ITEMS.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.faqItem, { backgroundColor: theme.background.secondary }]}
              onPress={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: theme.text.primary }]}>
                  {item.question}
                </Text>
                <ChevronRight 
                  size={20} 
                  color={theme.text.tertiary}
                  style={[styles.chevron, expandedItem === item.id && styles.chevronExpanded]}
                />
              </View>
              {expandedItem === item.id && (
                <Text style={[styles.faqAnswer, { color: theme.text.secondary }]}>
                  {item.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tips */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Tips</Text>
          <View style={styles.tipCard}>
            <Text style={[styles.tipText, { color: theme.text.secondary }]}>
              💡 Use budget templates to quickly set up budgets based on your business type
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={[styles.tipText, { color: theme.text.secondary }]}>
              📊 Check the dashboard regularly to monitor your business health score
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={[styles.tipText, { color: theme.text.secondary }]}>
              🔔 Set up low stock alerts to never run out of inventory
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={[styles.tipText, { color: theme.text.secondary }]}>
              📄 Export documents as PDF for professional presentation
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  supportOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  supportOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  supportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportOptionInfo: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  supportOptionDesc: {
    fontSize: 14,
  },
  faqItem: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 12,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },
  tipCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

