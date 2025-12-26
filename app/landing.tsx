import { router } from 'expo-router';
import { Sparkles, TrendingUp, Shield, Zap, ArrowRight, Star, CheckCircle2, Users, FileText, Calculator, BookOpen, AlertTriangle, BarChart3, DollarSign, Target } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';



export default function LandingScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, slideAnim, scaleAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={isDark ? ['#1E3A8A', '#7C3AED', '#DB2777'] : ['#0066CC', '#6366F1', '#EC4899']}
            style={styles.gradientBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          
          <Animated.View style={[
            styles.floatingCircle1,
            { transform: [{ rotate }] }
          ]} />
          <Animated.View style={[
            styles.floatingCircle2,
            { transform: [{ rotate }] }
          ]} />
          
          <Animated.View style={[
            styles.heroContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}>
            <View style={[styles.badge, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
              <Sparkles size={14} color="#FFF" />
              <Text style={[styles.badgeText, { color: '#FFF' }]}>
                For DreamBig Customers
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              Transform Your{'\n'}
              <Text style={styles.heroTitleAccent}>Business Dreams</Text>{'\n'}Into Reality
            </Text>

            <Text style={styles.heroSubtitle}>
              The complete business operating system trusted by entrepreneurs across Zimbabwe. 
              Track finances, automate documents, and grow with confidence.
            </Text>

            <View style={styles.ctaButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/sign-up' as any)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F0F0F0']}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.primaryButtonText, { color: isDark ? '#1E3A8A' : '#0066CC' }]}>
                    Start Free Today
                  </Text>
                  <ArrowRight size={20} color={isDark ? '#1E3A8A' : '#0066CC'} strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/sign-in' as any)}
                activeOpacity={0.9}
              >
                <Text style={styles.secondaryButtonText}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Users size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.statValue}>500+</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Star size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.statValue}>4.9</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <CheckCircle2 size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.statValue}>100%</Text>
                <Text style={styles.statLabel}>Zimbabwean</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.featuresSection, { backgroundColor: theme.background.primary }]}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.sectionHeaderContainer}>
              <Text style={[styles.sectionLabel, { color: theme.accent.primary }]}>FEATURES</Text>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Everything You Need to{'\n'}Run Your Business
              </Text>
              <Text style={[styles.sectionDesc, { color: theme.text.secondary }]}>
                Built specifically for Zimbabwean entrepreneurs
              </Text>
            </View>

            <View style={styles.features}>
              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <TrendingUp size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#10B981' }]}>CORE</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  Smart Financial Tracking
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Track sales, expenses, and profit in real-time. Designed for non-accountants — answer &ldquo;Am I making money?&rdquo; instantly.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Real-time profit calculation</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>USD & ZWL support</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Daily/Weekly/Monthly summaries</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <FileText size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#F59E0B' }]}>AUTOMATION</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  Document Automation
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Generate professional business documents in seconds. Invoices, receipts, quotations, business plans — all auto-filled and ready.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Auto-filled templates</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Professional layouts</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Export to PDF instantly</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Calculator size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#3B82F6' }]}>CRITICAL</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  Business Viability Engine
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Know if your business will succeed before you invest. Calculate break-even, profit timelines, and risk scores with inflation awareness.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Break-even analysis</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Risk scoring (Viable/Risky)</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Best/worst case scenarios</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Shield size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#EF4444' }]}>UNIQUE</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  Mistake Prevention System
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Stop problems before they happen. Get intelligent warnings about pricing, overspending, cash shortages, and expansion timing.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Smart risk alerts</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Clear consequences shown</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Safer alternatives provided</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <BarChart3 size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#581C87' : '#FAF5FF' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#8B5CF6' }]}>DASHBOARD</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  Smart Business Dashboard
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Your command center. See today&apos;s sales, monthly profit, cash position, and critical alerts — know instantly if you&apos;re okay or need to act.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Real-time metrics</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Visual insights & trends</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Priority alerts & warnings</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureCard, { 
                backgroundColor: theme.background.card,
                transform: [{ scale: scaleAnim }],
              }]}>
                <View style={styles.featureCardHeader}>
                  <LinearGradient
                    colors={['#EC4899', '#DB2777']}
                    style={styles.featureIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <BookOpen size={32} color="#FFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={[styles.featureBadge, { backgroundColor: isDark ? '#831843' : '#FDF2F8' }]}>
                    <Text style={[styles.featureBadgeText, { color: '#EC4899' }]}>POWERED BY</Text>
                  </View>
                </View>
                <Text style={[styles.featureTitle, { color: theme.text.primary }]}>
                  DreamBig Book Integration
                </Text>
                <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                  Your books unlock specialized tools and guidance. Link features to chapters, get contextual advice, and turn knowledge into action.
                </Text>
                <View style={styles.featurePoints}>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EC4899' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Book-based onboarding</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EC4899' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Contextual chapter links</Text>
                  </View>
                  <View style={styles.featurePoint}>
                    <View style={[styles.pointDot, { backgroundColor: '#EC4899' }]} />
                    <Text style={[styles.featurePointText, { color: theme.text.secondary }]}>Unlock premium features</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.whySection, { backgroundColor: theme.background.primary }]}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[styles.sectionLabel, { color: theme.accent.primary, textAlign: 'center' }]}>WHY DREAMBIG</Text>
            <Text style={[styles.sectionTitle, { color: theme.text.primary, textAlign: 'center', marginBottom: 48 }]}>
              Built for Real{'\n'}Zimbabwean Business
            </Text>

            <View style={styles.whyGrid}>
              <View style={[styles.whyCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.whyIcon, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
                  <DollarSign size={24} color="#3B82F6" strokeWidth={2.5} />
                </View>
                <View style={styles.whyContent}>
                  <Text style={[styles.whyTitle, { color: theme.text.primary }]}>Multi-Currency</Text>
                  <Text style={[styles.whyDesc, { color: theme.text.secondary }]}>Full USD & ZWL support with manual exchange rates</Text>
                </View>
              </View>

              <View style={[styles.whyCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.whyIcon, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}>
                  <AlertTriangle size={24} color="#F59E0B" strokeWidth={2.5} />
                </View>
                <View style={styles.whyContent}>
                  <Text style={[styles.whyTitle, { color: theme.text.primary }]}>Inflation Aware</Text>
                  <Text style={[styles.whyDesc, { color: theme.text.secondary }]}>Built for price instability and economic reality</Text>
                </View>
              </View>

              <View style={[styles.whyCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.whyIcon, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                  <Zap size={24} color="#10B981" strokeWidth={2.5} />
                </View>
                <View style={styles.whyContent}>
                  <Text style={[styles.whyTitle, { color: theme.text.primary }]}>Offline First</Text>
                  <Text style={[styles.whyDesc, { color: theme.text.secondary }]}>Works without internet, syncs when connected</Text>
                </View>
              </View>

              <View style={[styles.whyCard, { backgroundColor: theme.background.card }]}>
                <View style={[styles.whyIcon, { backgroundColor: isDark ? '#581C87' : '#FAF5FF' }]}>
                  <Target size={24} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <View style={styles.whyContent}>
                  <Text style={[styles.whyTitle, { color: theme.text.primary }]}>Simple English</Text>
                  <Text style={[styles.whyDesc, { color: theme.text.secondary }]}>No accounting jargon, built for entrepreneurs</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.testimonialSection, { backgroundColor: theme.background.secondary }]}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[styles.sectionLabel, { color: theme.accent.primary, textAlign: 'center' }]}>TESTIMONIALS</Text>
            <Text style={[styles.sectionTitle, { color: theme.text.primary, textAlign: 'center', marginBottom: 40 }]}>
              Trusted by Entrepreneurs
            </Text>
            
            <View style={[styles.testimonialCard, { 
              backgroundColor: theme.background.card,
              borderColor: theme.border.light,
            }]}>
              <View style={styles.quoteIconContainer}>
                <Text style={styles.quoteIcon}>&ldquo;</Text>
              </View>
              <Text style={[styles.testimonialQuote, { color: theme.text.primary }]}>
                DreamBig didn&apos;t just teach me business &mdash; they gave me the tools to run it. This app has everything I need in one place.
              </Text>
              <View style={styles.testimonialFooter}>
                <View style={[styles.testimonialAvatar, { backgroundColor: theme.accent.primary }]}>
                  <Text style={styles.testimonialAvatarText}>T</Text>
                </View>
                <View>
                  <Text style={[styles.testimonialAuthor, { color: theme.text.primary }]}>
                    Tendai M.
                  </Text>
                  <Text style={[styles.testimonialRole, { color: theme.text.tertiary }]}>
                    Retail Business Owner, Harare
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.testimonialCard, { 
              backgroundColor: theme.background.card,
              borderColor: theme.border.light,
            }]}>
              <View style={styles.quoteIconContainer}>
                <Text style={styles.quoteIcon}>&ldquo;</Text>
              </View>
              <Text style={[styles.testimonialQuote, { color: theme.text.primary }]}>
                The mistake prevention feature alone saved my business thousands. I know exactly when to act.
              </Text>
              <View style={styles.testimonialFooter}>
                <View style={[styles.testimonialAvatar, { backgroundColor: theme.accent.success }]}>
                  <Text style={styles.testimonialAvatarText}>S</Text>
                </View>
                <View>
                  <Text style={[styles.testimonialAuthor, { color: theme.text.primary }]}>
                    Sarah K.
                  </Text>
                  <Text style={[styles.testimonialRole, { color: theme.text.tertiary }]}>
                    Salon Owner, Bulawayo
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.ctaSection, { backgroundColor: theme.background.primary }]}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <LinearGradient
              colors={isDark ? ['#1E3A8A', '#7C3AED'] : ['#0066CC', '#6366F1']}
              style={styles.ctaCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.ctaTitle}>Ready to Transform Your Business?</Text>
              <Text style={styles.ctaSubtitle}>
                Join hundreds of successful entrepreneurs using DreamBig Business OS
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/sign-up' as any)}
                activeOpacity={0.9}
              >
                <Text style={[styles.ctaButtonText, { color: isDark ? '#1E3A8A' : '#0066CC' }]}>
                  Start Your Free Journey
                </Text>
                <ArrowRight size={20} color={isDark ? '#1E3A8A' : '#0066CC'} strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>

        <View style={[styles.footer, { backgroundColor: theme.background.secondary }]}>
          <Text style={[styles.footerBrand, { color: theme.accent.primary }]}>DreamBig Business OS</Text>
          <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
            Empowering entrepreneurs across Zimbabwe
          </Text>
          <Text style={[styles.footerText, { color: theme.text.tertiary }]}>
            Version 1.0.0 • Made with ❤️ in Zimbabwe
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    minHeight: 680,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -120,
    right: -100,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -80,
    left: -80,
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  heroTitle: {
    fontSize: 46,
    fontWeight: '900' as const,
    lineHeight: 54,
    marginBottom: 16,
    color: '#FFF',
  },
  heroTitleAccent: {
    color: '#FBBF24',
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 40,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  ctaButtons: {
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  sectionHeaderContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '900' as const,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    gap: 24,
  },
  featureCard: {
    padding: 32,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  featureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 12,
    lineHeight: 30,
  },
  featureDesc: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 20,
  },
  featurePoints: {
    gap: 12,
  },
  featurePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  featurePointText: {
    fontSize: 15,
    flex: 1,
  },
  whySection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  whyGrid: {
    gap: 20,
  },
  whyCard: {
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  whyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyContent: {
    flex: 1,
  },
  whyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  whyDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  testimonialSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  testimonialCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  quoteIconContainer: {
    marginBottom: 16,
  },
  quoteIcon: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#0066CC',
    opacity: 0.3,
  },
  testimonialQuote: {
    fontSize: 19,
    lineHeight: 30,
    marginBottom: 24,
    fontWeight: '500' as const,
  },
  testimonialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  testimonialAuthor: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  testimonialRole: {
    fontSize: 14,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  ctaCard: {
    padding: 40,
    borderRadius: 28,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  ctaSubtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  footer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerBrand: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
