import { Stack, router } from 'expo-router';
import { HelpCircle, Book, Mail, MessageCircle, X, ChevronRight, Edit } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: () => void;
}

interface QuickTip {
  id: string;
  text: string;
}

// Icon mapping
const iconMap: Record<string, any> = {
  Mail,
  MessageCircle,
  Book,
  HelpCircle,
};

export default function HelpScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [supportOptions, setSupportOptions] = useState<SupportOption[]>([]);
  const [quickTips, setQuickTips] = useState<QuickTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHelpContent();
  }, []);

  const loadHelpContent = async () => {
    try {
      setIsLoading(true);
      
      // Load FAQs
      const { data: faqData } = await supabase
        .from('help_content')
        .select('*')
        .eq('content_type', 'faq')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (faqData) {
        setFaqItems(faqData.map(item => ({
          id: item.faq_id || item.id,
          question: item.faq_question || '',
          answer: item.faq_answer || '',
        })));
      }

      // Load support options
      const { data: supportData } = await supabase
        .from('help_content')
        .select('*')
        .eq('content_type', 'support_option')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (supportData) {
        setSupportOptions(supportData.map(item => {
          const Icon = iconMap[item.support_icon] || HelpCircle;
          const actionType = item.support_action_type;
          const actionValue = item.support_action_value || '';

          let action: () => void;
          if (actionType === 'email') {
            action = () => Linking.openURL(`mailto:${actionValue}`);
          } else if (actionType === 'whatsapp') {
            action = () => Linking.openURL(actionValue);
          } else if (actionType === 'url') {
            action = () => Linking.openURL(actionValue);
          } else if (actionType === 'internal') {
            action = () => router.push(actionValue as any);
          } else {
            action = () => {};
          }

          return {
            id: item.support_id || item.id,
            title: item.support_title || '',
            description: item.support_description || '',
            icon: Icon,
            action,
          };
        }));
      }

      // Load quick tips
      const { data: tipsData } = await supabase
        .from('help_content')
        .select('*')
        .eq('content_type', 'quick_tip')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (tipsData) {
        setQuickTips(tipsData.map(item => ({
          id: item.id,
          text: item.tip_text || '',
        })));
      }
    } catch (error) {
      console.error('Failed to load help content:', error);
      // Fallback to empty arrays
      setFaqItems([]);
      setSupportOptions([]);
      setQuickTips([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Help & Support', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Help & Support</Text>
        <View style={styles.headerRight}>
          {isSuperAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/admin/help-content' as any)}
              style={[styles.editButton, { backgroundColor: theme.accent.primary + '20' }]}
            >
              <Edit size={20} color={theme.accent.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Support Options */}
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Get Support</Text>
            {supportOptions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No support options available
              </Text>
            ) : (
              supportOptions.map(option => (
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
              ))
            )}
          </View>

          {/* FAQ Section */}
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <View style={styles.sectionHeader}>
              <HelpCircle size={20} color={theme.accent.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Frequently Asked Questions</Text>
            </View>
            {faqItems.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No FAQs available
              </Text>
            ) : (
              faqItems.map(item => (
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
              ))
            )}
          </View>

          {/* Quick Tips */}
          {quickTips.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Tips</Text>
              {quickTips.map(tip => (
                <View key={tip.id} style={[styles.tipCard, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.tipText, { color: theme.text.secondary }]}>
                    {tip.text}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
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
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

