import { Stack, router, useLocalSearchParams } from 'expo-router';
import { DollarSign, Building2, Users as UsersIcon, MapPin, Phone, Mail, Save, FileText, Moon, Sun, LogOut, Download, Upload, Database, Image as ImageIcon, X, Settings as SettingsIcon, MessageSquare, Bell, Globe, CheckCircle, XCircle, Crown, BookOpen, ChevronRight, Zap, Shield } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert as RNAlert,
  Switch,
  Image,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import type { BusinessStage, Currency, DreamBigBook } from '@/types/business';
import { PERMISSION_CATEGORIES, type PermissionCode } from '@/types/employee-permissions';
import { exportAllData, shareData } from '@/lib/data-export';
import { DREAMBIG_BOOKS, getBookFeatures } from '@/constants/books';
import { getAllPublishedBooks } from '@/lib/book-service';
import type { Book } from '@/types/books';

export default function SettingsScreen() {
  const { 
    business, 
    saveBusiness, 
    exchangeRate, 
    updateExchangeRate,
    transactions,
    documents,
    products,
    customers,
    suppliers,
    budgets,
    cashflowProjections,
    taxRates,
    employees,
    projects,
    addTransaction,
    addDocument,
    addProduct,
    addCustomer,
    addSupplier,
    addBudget,
    addCashflowProjection,
    addTaxRate,
    addEmployee,
    addProject,
    updateEmployee,
    isEmployee,
    currentEmployee,
    employeePermissions,
  } = useBusiness();
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut, user, isSuperAdmin } = useAuth();
  const { 
    settings, 
    updateNotificationPreference, 
    updateLanguage, 
    updateCurrencyPreference, 
    updateIntegrationPreference,
    updateRemoveProofConfirmPreference,
    isLoading: settingsLoading 
  } = useSettings();
  const { currentPlan } = usePremium();
  const { t } = useTranslation();
  const businessStages: { value: BusinessStage; label: string; desc: string }[] = [
    { value: 'idea', label: 'Idea Stage', desc: 'Planning to start' },
    { value: 'running', label: 'Running', desc: 'Already operating' },
    { value: 'growing', label: 'Growing', desc: 'Expanding operations' },
  ];
  const genderOptions = [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'non_binary', label: 'Non-binary' },
    { value: 'prefer_not_say', label: 'Prefer not to say' },
  ];
  const [showBookModal, setShowBookModal] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [confirmProofSectionY, setConfirmProofSectionY] = useState(0);
  const searchParams = useLocalSearchParams<{ section?: string }>();
  const confirmProofHighlight = useRef(new Animated.Value(0)).current;
  const [databaseBooks, setDatabaseBooks] = useState<Book[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [featureConfigs, setFeatureConfigs] = useState<{ featureId: string; name: string }[]>([]);
  const [name, setName] = useState(business?.name || '');
  const [owner, setOwner] = useState(business?.owner || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [email, setEmail] = useState(business?.email || '');
  const [address, setAddress] = useState(business?.address || '');
  const [location, setLocation] = useState(business?.location || '');
  const [capital, setCapital] = useState(business?.capital.toString() || '');
  const [currency, setCurrency] = useState<Currency>(business?.currency || 'USD');
  const [stage, setStage] = useState<BusinessStage>(business?.stage || 'running');
  const [rate, setRate] = useState(exchangeRate.usdToZwl.toString());
  const [isImportingData, setIsImportingData] = useState(false);
  const [logo, setLogo] = useState<string | undefined>(business?.logo);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [employeeProfileName, setEmployeeProfileName] = useState('');
  const [employeeProfileEmail, setEmployeeProfileEmail] = useState('');
  const [employeeProfilePhone, setEmployeeProfilePhone] = useState('');
  const [isSavingEmployeeProfile, setIsSavingEmployeeProfile] = useState(false);
  const [adTrackingConsent, setAdTrackingConsent] = useState(false);
  const [personalizedAdsConsent, setPersonalizedAdsConsent] = useState(false);
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [interestsInput, setInterestsInput] = useState('');
  const [isLoadingAdPreferences, setIsLoadingAdPreferences] = useState(false);
  const [isSavingAdPreferences, setIsSavingAdPreferences] = useState(false);
  const selectedStage = businessStages.find(stageOption => stageOption.value === stage);
  const hasSettingsAccess =
    !isEmployee ||
    employeePermissions.includes('settings:view') ||
    employeePermissions.includes('settings:edit');
  const canEditSettings = !isEmployee || employeePermissions.includes('settings:edit');
  const businessSectionDisabled = isEmployee || !canEditSettings;
  const canManageData = !isEmployee || employeePermissions.includes('settings:edit');
  const displayName = isEmployee ? currentEmployee?.name || user?.name : user?.name;
  const displayEmail = isEmployee ? currentEmployee?.email || user?.email : user?.email;
  const formatPermissionLabel = (code: PermissionCode) => {
    const [category, action] = code.split(':');
    const categoryLabel = (PERMISSION_CATEGORIES as any)[category] || category;
    const actionLabel = action ? action.replace(/_/g, ' ') : 'access';
    return `${categoryLabel} • ${actionLabel}`;
  };

  useEffect(() => {
    if (business) {
      setName(business.name);
      setOwner(business.owner);
      setPhone(business.phone || '');
      setEmail(business.email || '');
      setAddress(business.address || '');
      setLocation(business.location);
      setCapital(business.capital.toString());
      setCurrency(business.currency);
      setStage(business.stage || 'running');
      setLogo(business.logo);
    }
  }, [business]);

  useEffect(() => {
    if (isEmployee) {
      setEmployeeProfileName(currentEmployee?.name || '');
      setEmployeeProfileEmail(currentEmployee?.email || '');
      setEmployeeProfilePhone(currentEmployee?.phone || '');
    }
  }, [isEmployee, currentEmployee?.name, currentEmployee?.email, currentEmployee?.phone]);

  useEffect(() => {
    if (user?.id) {
      loadAdPreferences();
    }
  }, [user?.id]);

  useEffect(() => {
    if (searchParams.section === 'confirm-proof' && confirmProofSectionY > 0) {
      scrollRef.current?.scrollTo({ y: confirmProofSectionY - 20, animated: true });
      confirmProofHighlight.setValue(0);
      Animated.sequence([
        Animated.timing(confirmProofHighlight, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(confirmProofHighlight, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start();
    }
  }, [searchParams.section, confirmProofSectionY]);

  // Load books and features from database
  useEffect(() => {
    const loadDatabaseBooks = async () => {
      try {
        setIsLoadingBooks(true);
        const books = await getAllPublishedBooks();
        setDatabaseBooks(books);
      } catch (error) {
        console.error('Failed to load books from database:', error);
      } finally {
        setIsLoadingBooks(false);
      }
    };

    const loadFeatures = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_config')
          .select('feature_id, name')
          .eq('enabled', true);

        if (error) throw error;

        if (data) {
          setFeatureConfigs(data.map((row: any) => ({
            featureId: row.feature_id,
            name: row.name,
          })));
        }
      } catch (error) {
        console.error('Failed to load features:', error);
      }
    };

    loadDatabaseBooks();
    loadFeatures();
  }, []);

  const handleToggleSMS = async (enabled: boolean) => {
    try {
      await updateIntegrationPreference('sms', enabled);
      RNAlert.alert('Success', `SMS ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error toggling SMS:', error);
      RNAlert.alert(
        'Error',
        error.message || 'Failed to update SMS settings. SMS service may need to be configured by an administrator first.',
        [
          { text: 'OK' },
          { text: 'Go to Integrations', onPress: () => router.push('/admin/integrations' as any) },
        ]
      );
    }
  };

  const handleToggleEmail = async (enabled: boolean) => {
    try {
      await updateIntegrationPreference('email', enabled);
      RNAlert.alert('Success', `Email ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error toggling Email:', error);
      RNAlert.alert('Error', error.message || 'Failed to update email settings');
    }
  };

  const handleToggleRemoveProofConfirm = async (enabled: boolean) => {
    try {
      await updateRemoveProofConfirmPreference(enabled);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update confirmation setting.');
    }
  };

  const loadAdPreferences = async () => {
    if (!user?.id) return;
    try {
      setIsLoadingAdPreferences(true);
      const { data, error } = await supabase
        .from('users')
        .select('gender, birth_date, interests, ad_tracking_consent, personalized_ads_consent')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setGender(data?.gender || '');
      setBirthDate(data?.birth_date || '');
      setInterestsInput(Array.isArray(data?.interests) ? data.interests.join(', ') : '');
      setAdTrackingConsent(Boolean(data?.ad_tracking_consent));
      setPersonalizedAdsConsent(Boolean(data?.personalized_ads_consent));
    } catch (error) {
      console.error('Failed to load ad preferences:', error);
    } finally {
      setIsLoadingAdPreferences(false);
    }
  };

  const handleSaveAdPreferences = async () => {
    if (!user?.id) return;
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      RNAlert.alert('Invalid date', 'Use YYYY-MM-DD format for birth date.');
      return;
    }

    try {
      setIsSavingAdPreferences(true);
      const interests = interestsInput
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 25);

      const { error } = await supabase
        .from('users')
        .update({
          gender: gender || null,
          birth_date: birthDate || null,
          interests,
          ad_tracking_consent: adTrackingConsent,
          personalized_ads_consent: personalizedAdsConsent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      RNAlert.alert('Saved', 'Ad preferences updated.');
    } catch (error: any) {
      RNAlert.alert('Error', error?.message || 'Failed to save ad preferences.');
    } finally {
      setIsSavingAdPreferences(false);
    }
  };

  const handleToggleWhatsApp = async (enabled: boolean) => {
    try {
      await updateIntegrationPreference('whatsapp', enabled);
      RNAlert.alert('Success', `WhatsApp ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error toggling WhatsApp:', error);
      RNAlert.alert(
        'Error',
        error.message || 'Failed to update WhatsApp settings. WhatsApp service may need to be configured by an administrator first.',
        [
          { text: 'OK' },
          { text: 'Go to Integrations', onPress: () => router.push('/admin/integrations' as any) },
        ]
      );
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      await updateNotificationPreference(enabled);
      RNAlert.alert('Success', `Push notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update notification settings');
    }
  };

  const handleUpdateLanguage = async (lang: string) => {
    try {
      await updateLanguage(lang);
      // The app will automatically update because useTranslation reads from settings
      RNAlert.alert(
        t('common.success'), 
        t('settings.language') + ' ' + t('common.save').toLowerCase() + 'd. The app will update shortly.',
        [{ text: t('common.confirm') }]
      );
    } catch (error: any) {
      RNAlert.alert(t('common.error'), error.message || 'Failed to update language');
    }
  };

  const handleUpdateCurrencyPreference = async (curr: Currency) => {
    try {
      await updateCurrencyPreference(curr);
      RNAlert.alert('Success', 'Currency preference updated');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update currency preference');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploadingLogo(true);
        try {
          const base64 = await getBase64FromAsset(asset);
          const fileName = buildAssetFileName(asset, `business-logo-${business?.id || 'temp'}`);
          const filePath = `logos/${fileName}`;

          const publicUrl = await uploadBase64ToStorage(supabase, {
            bucket: 'business_logos',
            filePath,
            base64,
            contentType: asset.mimeType || 'image/jpeg',
            upsert: true,
          });

          setLogo(publicUrl);
        } catch (error: any) {
          console.error('Error uploading logo:', error);
          RNAlert.alert('Upload Error', error.message || 'Failed to upload logo');
        } finally {
          setIsUploadingLogo(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      RNAlert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveLogo = () => {
    setLogo(undefined);
  };

  const handleSaveProfile = async () => {
    if (businessSectionDisabled) {
      RNAlert.alert('Access Restricted', 'Only the business owner can edit business details.');
      return;
    }
    if (!business || !name || !owner || !location || !capital) {
      RNAlert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      await saveBusiness({
        ...business,
        name,
        owner,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        location,
        capital: parseFloat(capital) || 0,
        currency,
        stage,
        logo,
      });

      RNAlert.alert('Success', 'Profile updated successfully. All documents will now use the updated information.');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleSaveEmployeeProfile = async () => {
    if (!currentEmployee?.id) {
      RNAlert.alert('Error', 'Employee profile not found');
      return;
    }
    if (!employeeProfileName.trim()) {
      RNAlert.alert('Missing Fields', 'Please enter your name');
      return;
    }

    setIsSavingEmployeeProfile(true);
    try {
      await updateEmployee(currentEmployee.id, {
        name: employeeProfileName.trim(),
        email: employeeProfileEmail.trim() || undefined,
        phone: employeeProfilePhone.trim() || undefined,
      });
      RNAlert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSavingEmployeeProfile(false);
    }
  };

  const handleUpdateRate = async () => {
    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      RNAlert.alert('Invalid Rate', 'Please enter a valid exchange rate');
      return;
    }

    await updateExchangeRate(rateValue);
    RNAlert.alert('Success', 'Exchange rate updated');
  };

  const handleSignOut = () => {
    RNAlert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              console.error('Sign out failed:', error);
            } finally {
              router.replace('/landing' as any);
            }
          },
        },
      ]
    );
  };


  // Helper function to get book info (checks both hardcoded and database books)
  const getSelectedBookInfo = () => {
    if (!business?.dreamBigBook) return null;
    
    // First check hardcoded books
    const hardcodedBook = DREAMBIG_BOOKS.find(b => b.id === business.dreamBigBook);
    if (hardcodedBook) {
      return {
        title: hardcodedBook.title,
        subtitle: hardcodedBook.subtitle,
        color: hardcodedBook.color,
        features: getBookFeatures(business.dreamBigBook),
      };
    }
    
    // Then check database books
    const dbBook = databaseBooks.find(b => b.slug === business.dreamBigBook);
    if (dbBook) {
      const featureIds = dbBook.enabledFeatures || [];
      const featureNames = featureIds
        .map(id => {
          const feature = featureConfigs.find(f => f.featureId === id);
          return feature ? feature.name : id;
        })
        .filter(Boolean);
      
      return {
        title: dbBook.title,
        subtitle: dbBook.subtitle || 'DreamBig Book',
        color: dbBook.isFeatured ? '#0066CC' : '#64748B',
        features: featureNames,
      };
    }
    
    return null;
  };

  const handleBookChange = async (bookId: DreamBigBook) => {
    if (!business || !business.id) {
      RNAlert.alert('Error', 'Business profile not found. Please refresh and try again.');
      return;
    }

    try {
      await saveBusiness({
        ...business,
        id: business.id, // Explicitly ensure ID is present
        dreamBigBook: bookId,
      });
      setShowBookModal(false);
      RNAlert.alert('Success', 'Book selection updated successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update book selection');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    if (!canManageData) {
      RNAlert.alert('Access Restricted', 'Only the business owner can export data.');
      return;
    }
    try {
      const data = exportAllData({
        transactions,
        documents,
        products,
        customers,
        suppliers,
        budgets,
        cashflowProjections,
        taxRates,
        employees,
        projects,
        business,
      }, {
        format,
        includeTransactions: true,
        includeDocuments: true,
        includeProducts: true,
        includeCustomers: true,
        includeSuppliers: true,
        includeBudgets: true,
        includeCashflow: true,
        includeTaxRates: true,
        includeEmployees: true,
        includeProjects: true,
      });

      const filename = `dreambig-export-${new Date().toISOString().split('T')[0]}.${format}`;
      const mimeType = format === 'csv' ? 'text/csv' : 'application/json';
      
      await shareData(data, filename, mimeType);
      RNAlert.alert('Success', `Data exported successfully as ${format.toUpperCase()}`);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const handleImportData = async () => {
    if (!canManageData) {
      RNAlert.alert('Access Restricted', 'Only the business owner can import data.');
      return;
    }
    if (!business?.id) {
      RNAlert.alert('Error', 'Business profile not found. Please refresh and try again.');
      return;
    }

    try {
      setIsImportingData(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: 'utf8' });
      const parsed = JSON.parse(content);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON file');
      }

      if (parsed.business) {
        await saveBusiness({
          ...business,
          ...parsed.business,
          id: business.id,
        });
      }

      const stripMeta = <T extends Record<string, any>>(item: T) => {
        const { id, createdAt, updatedAt, ...rest } = item;
        return rest as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
      };

      if (Array.isArray(parsed.transactions)) {
        for (const t of parsed.transactions) {
          await addTransaction(stripMeta(t));
        }
      }

      if (Array.isArray(parsed.documents)) {
        for (const d of parsed.documents) {
          const { id, createdAt, updatedAt, documentNumber, ...rest } = d;
          await addDocument(rest);
        }
      }

      if (Array.isArray(parsed.products)) {
        for (const p of parsed.products) {
          await addProduct(stripMeta(p));
        }
      }

      if (Array.isArray(parsed.customers)) {
        for (const c of parsed.customers) {
          await addCustomer(stripMeta(c));
        }
      }

      if (Array.isArray(parsed.suppliers)) {
        for (const s of parsed.suppliers) {
          await addSupplier(stripMeta(s));
        }
      }

      if (Array.isArray(parsed.budgets)) {
        for (const b of parsed.budgets) {
          await addBudget(stripMeta(b));
        }
      }

      if (Array.isArray(parsed.cashflowProjections)) {
        for (const c of parsed.cashflowProjections) {
          await addCashflowProjection(stripMeta(c));
        }
      }

      if (Array.isArray(parsed.taxRates)) {
        for (const t of parsed.taxRates) {
          await addTaxRate(stripMeta(t));
        }
      }

      if (Array.isArray(parsed.employees)) {
        for (const e of parsed.employees) {
          await addEmployee(stripMeta(e));
        }
      }

      if (Array.isArray(parsed.projects)) {
        for (const p of parsed.projects) {
          await addProject(stripMeta(p));
        }
      }

      RNAlert.alert('Import Complete', 'Your data has been imported successfully.');
    } catch (error: any) {
      console.error('Import failed:', error);
      RNAlert.alert('Import Failed', error.message || 'Failed to import data');
    } finally {
      setIsImportingData(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background.secondary }]} 
        contentContainerStyle={styles.content}
        ref={scrollRef}
      >
        <View style={[styles.userCard, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={[styles.userAvatar, { backgroundColor: theme.surface.info }]}>
            <Text style={[styles.userAvatarText, { color: theme.accent.info }]}>
              {(displayName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text.primary }]}>
              {displayName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.text.secondary }]}>
              {displayEmail}
            </Text>
          </View>
        </View>
        {isEmployee && (
          <View style={[styles.employeeInfoCard, { 
            backgroundColor: theme.background.card,
            borderColor: theme.border.light,
          }]}>
            <View style={styles.employeeInfoRow}>
              <Building2 size={18} color={theme.accent.primary} />
              <Text style={[styles.employeeInfoLabel, { color: theme.text.secondary }]}>
                Assigned business
              </Text>
            </View>
            <Text style={[styles.employeeInfoValue, { color: theme.text.primary }]} numberOfLines={1}>
              {business?.name || 'Assigned by owner'}
            </Text>
            <View style={[styles.employeeInfoRow, { marginTop: 10 }]}>
              <UsersIcon size={18} color={theme.accent.primary} />
              <Text style={[styles.employeeInfoLabel, { color: theme.text.secondary }]}>
                Role & permissions
              </Text>
            </View>
            <Text style={[styles.employeeInfoValue, { color: theme.text.primary }]} numberOfLines={1}>
              {currentEmployee?.roleName || 'Employee'} • Managed by owner
            </Text>
          </View>
        )}
        {isEmployee && (
          <View style={[styles.section, { 
            backgroundColor: theme.background.card,
            borderColor: theme.border.light,
          }]}>
            <View style={styles.sectionHeader}>
              <UsersIcon size={20} color={theme.accent.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                My Profile
              </Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.light,
                  color: theme.text.primary,
                }]}
                value={employeeProfileName}
                onChangeText={setEmployeeProfileName}
                placeholder="Enter your name"
                placeholderTextColor={theme.text.tertiary}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Email</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.light,
                  color: theme.text.primary,
                }]}
                value={employeeProfileEmail}
                onChangeText={setEmployeeProfileEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Phone</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.light,
                  color: theme.text.primary,
                }]}
                value={employeeProfilePhone}
                onChangeText={setEmployeeProfilePhone}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.accent.primary,
                  opacity: isSavingEmployeeProfile ? 0.7 : 1,
                },
              ]}
              onPress={handleSaveEmployeeProfile}
              disabled={isSavingEmployeeProfile}
            >
              {isSavingEmployeeProfile ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Save size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        {isEmployee && !hasSettingsAccess && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary, textAlign: 'center' }]}>
              Limited settings access
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.text.secondary, textAlign: 'center' }]}>
              Your business owner controls which settings employees can view or edit.
            </Text>
          </View>
        )}

        {hasSettingsAccess && (
          <>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
          opacity: canManageData ? 1 : 0.7,
        }]}>
          <View style={styles.sectionHeader}>
            {isDark ? (
              <Moon size={20} color={theme.accent.primary} />
            ) : (
              <Sun size={20} color={theme.accent.primary} />
            )}
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {t('settings.appearance')}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                {t('settings.darkMode')}
              </Text>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {t('settings.switchTheme')}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {t('settings.configurations')}
            </Text>
          </View>

          {/* SMS Settings */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTitleRow}>
                <MessageSquare size={18} color={theme.accent.primary} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  {t('settings.smsNotifications')}
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {t('settings.sendPaymentReminders')}
              </Text>
              {settings.smsEnabled && (
                <View style={[styles.statusBadge, { backgroundColor: theme.accent.success + '20' }]}>
                  <CheckCircle size={12} color={theme.accent.success} />
                  <Text style={[styles.statusText, { color: theme.accent.success }]}>
                    {t('settings.active')}
                  </Text>
                </View>
              )}
              {!settings.smsEnabled && (
                <View style={[styles.statusBadge, { backgroundColor: theme.text.tertiary + '20' }]}>
                  <XCircle size={12} color={theme.text.tertiary} />
                  <Text style={[styles.statusText, { color: theme.text.tertiary }]}>
                    {t('settings.inactive')}
                  </Text>
                </View>
              )}
            </View>
            <Switch
              value={settings.smsEnabled}
              onValueChange={handleToggleSMS}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
              disabled={settingsLoading}
            />
          </View>

          {/* Email Settings */}
          <View
            style={[styles.settingRow, { marginTop: 16 }]}
            onLayout={(event) => setConfirmProofSectionY(event.nativeEvent.layout.y)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingTitleRow}>
                <Mail size={18} color={theme.accent.primary} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  {t('settings.emailNotifications')}
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {t('settings.sendInvoicesReceipts')}
              </Text>
              {settings.emailEnabled && (
                <View style={[styles.statusBadge, { backgroundColor: theme.accent.success + '20' }]}>
                  <CheckCircle size={12} color={theme.accent.success} />
                  <Text style={[styles.statusText, { color: theme.accent.success }]}>
                    {t('settings.active')}
                  </Text>
                </View>
              )}
            </View>
            <Switch
              value={settings.emailEnabled}
              onValueChange={handleToggleEmail}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
              disabled={settingsLoading}
            />
          </View>

          {/* WhatsApp Settings */}
          <View style={[styles.settingRow, { marginTop: 16 }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTitleRow}>
                <MessageSquare size={18} color={theme.accent.primary} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  {t('settings.whatsappBusiness')}
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {t('settings.sendInvoicesReminders')}
              </Text>
              {settings.whatsappEnabled && (
                <View style={[styles.statusBadge, { backgroundColor: theme.accent.success + '20' }]}>
                  <CheckCircle size={12} color={theme.accent.success} />
                  <Text style={[styles.statusText, { color: theme.accent.success }]}>
                    {t('settings.active')}
                  </Text>
                </View>
              )}
              {!settings.whatsappEnabled && (
                <View style={[styles.statusBadge, { backgroundColor: theme.text.tertiary + '20' }]}>
                  <XCircle size={12} color={theme.text.tertiary} />
                  <Text style={[styles.statusText, { color: theme.text.tertiary }]}>
                    {t('settings.inactive')}
                  </Text>
                </View>
              )}
            </View>
            <Switch
              value={settings.whatsappEnabled}
              onValueChange={handleToggleWhatsApp}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
              disabled={settingsLoading}
            />
          </View>

          {/* Notifications */}
          <View style={[styles.settingRow, { marginTop: 16 }]}>
            <View style={styles.settingLeft}>
              <View style={styles.settingTitleRow}>
                <Bell size={18} color={theme.accent.primary} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  {t('settings.pushNotifications')}
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {t('settings.receiveAlerts')}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
              disabled={settingsLoading}
            />
          </View>
          <Animated.View
            style={[
              styles.settingRow,
              { marginTop: 16 },
              {
                backgroundColor: confirmProofHighlight.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['transparent', 'rgba(245, 158, 11, 0.15)'],
                }),
              },
            ]}
            onLayout={(event) => setConfirmProofSectionY(event.nativeEvent.layout.y)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingTitleRow}>
                <Bell size={18} color={theme.accent.primary} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  Confirm proof removal
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                Ask before removing payment proof images
              </Text>
            </View>
            <Switch
              value={settings.confirmRemoveProofEnabled}
              onValueChange={handleToggleRemoveProofConfirm}
              trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
              thumbColor="#FFF"
              disabled={settingsLoading}
            />
          </Animated.View>

          {/* Language Preference */}
          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <View style={styles.settingTitleRow}>
              <Globe size={18} color={theme.accent.primary} />
              <Text style={[styles.label, { color: theme.text.secondary, marginLeft: 8 }]}>
                {t('settings.language')}
              </Text>
            </View>
            <View style={styles.currencyRow}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: settings.language === 'en' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => handleUpdateLanguage('en')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: settings.language === 'en' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: settings.language === 'sn' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => handleUpdateLanguage('sn')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: settings.language === 'sn' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  Shona
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: settings.language === 'nd' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => handleUpdateLanguage('nd')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: settings.language === 'nd' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  Ndebele
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Currency Preference */}
          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <View style={styles.settingTitleRow}>
              <DollarSign size={18} color={theme.accent.primary} />
              <Text style={[styles.label, { color: theme.text.secondary, marginLeft: 8 }]}>
                {t('settings.defaultCurrency')}
              </Text>
            </View>
            <Text style={[styles.hint, { color: theme.text.tertiary }]}>
              {t('settings.preferredCurrency')}
            </Text>
            <View style={styles.currencyRow}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: settings.currencyPreference === 'USD' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => handleUpdateCurrencyPreference('USD')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: settings.currencyPreference === 'USD' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  USD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: settings.currencyPreference === 'ZWL' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => handleUpdateCurrencyPreference('ZWL')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: settings.currencyPreference === 'ZWL' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  ZWL
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <UsersIcon size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Ad Preferences
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
            Share demographics to unlock audience analytics and better ad personalization.
          </Text>

          {isLoadingAdPreferences ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={theme.accent.primary} />
            </View>
          ) : (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingTitleRow}>
                    <Bell size={18} color={theme.accent.primary} />
                    <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                      Allow ad tracking
                    </Text>
                  </View>
                  <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                    Required to include your profile in ad analytics.
                  </Text>
                </View>
                <Switch
                  value={adTrackingConsent}
                  onValueChange={setAdTrackingConsent}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={[styles.settingRow, { marginTop: 16 }]}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingTitleRow}>
                    <SettingsIcon size={18} color={theme.accent.primary} />
                    <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                      Personalized ads
                    </Text>
                  </View>
                  <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                    Use your interests to personalize ad delivery.
                  </Text>
                </View>
                <Switch
                  value={personalizedAdsConsent}
                  onValueChange={setPersonalizedAdsConsent}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Gender</Text>
                <View style={styles.currencyRow}>
                  {genderOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.currencyButton,
                        {
                          borderColor: theme.border.light,
                          backgroundColor: gender === option.value ? theme.accent.primary : theme.background.secondary,
                        },
                      ]}
                      onPress={() => setGender(option.value)}
                    >
                      <Text
                        style={[
                          styles.currencyButtonText,
                          { color: gender === option.value ? '#FFF' : theme.text.secondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Birth date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.tertiary}
                  value={birthDate}
                  onChangeText={setBirthDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Interests</Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                  Separate interests with commas (e.g., retail, fashion, food).
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  placeholder="business, marketing, finance"
                  placeholderTextColor={theme.text.tertiary}
                  value={interestsInput}
                  onChangeText={setInterestsInput}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary, opacity: isSavingAdPreferences ? 0.7 : 1 }]}
                onPress={handleSaveAdPreferences}
                disabled={isSavingAdPreferences}
              >
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {isSavingAdPreferences ? 'Saving...' : 'Save Ad Preferences'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Subscription Plan Section */}
        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <Crown size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Subscription Plan
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/subscription' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                {currentPlan ? currentPlan.name : 'Free Plan'}
              </Text>
              <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
                {currentPlan 
                  ? `Manage your subscription and upgrade options` 
                  : `Upgrade to unlock premium features and capabilities`}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Book Selection Section */}
        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              DreamBig Book
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowBookModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={styles.bookInfoRow}>
                <View style={[styles.bookColorDot, { 
                  backgroundColor: (() => {
                    const bookInfo = getSelectedBookInfo();
                    return bookInfo ? bookInfo.color : '#64748B';
                  })()
                }]} />
                <Text style={[styles.settingLabel, { color: theme.text.primary }]}>
                  {(() => {
                    const bookInfo = getSelectedBookInfo();
                    return bookInfo ? bookInfo.title : 'No Book Selected';
                  })()}
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: theme.text.secondary, marginTop: 4 }]}>
                {(() => {
                  const bookInfo = getSelectedBookInfo();
                  if (!bookInfo) return 'Select a book to unlock specialized features';
                  return `${bookInfo.subtitle} - ${bookInfo.features.length} features unlocked`;
                })()}
              </Text>
              {(() => {
                const bookInfo = getSelectedBookInfo();
                if (!bookInfo || bookInfo.features.length === 0) return null;
                return (
                  <View style={styles.featuresList}>
                    {bookInfo.features.slice(0, 3).map((feature, idx) => (
                      <View key={idx} style={[styles.featureTag, { backgroundColor: theme.background.secondary }]}>
                        <Zap size={12} color={bookInfo.color} />
                        <Text style={[styles.featureTagText, { color: theme.text.secondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))}
                    {bookInfo.features.length > 3 && (
                      <Text style={[styles.featureMoreText, { color: theme.text.tertiary }]}>
                        +{bookInfo.features.length - 3} more
                      </Text>
                    )}
                  </View>
                );
              })()}
            </View>
            <ChevronRight size={20} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {isEmployee && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Shield size={20} color={theme.accent.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Employee Access
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
              Assigned by your business owner. Contact them to change your role or permissions.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Assigned Role</Text>
              <Text style={[styles.valueText, { color: theme.text.primary }]}>
                {currentEmployee?.roleName || 'Unassigned'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Permissions</Text>
              {employeePermissions.length > 0 ? (
                <View style={styles.featuresList}>
                  {employeePermissions.map(permission => (
                    <View
                      key={permission}
                      style={[styles.featureTag, { backgroundColor: theme.background.secondary }]}
                    >
                      <Text style={[styles.featureTagText, { color: theme.text.secondary }]}>
                        {formatPermissionLabel(permission)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                  No permissions assigned yet.
                </Text>
              )}
            </View>
          </View>
        )}

        <View
          pointerEvents={businessSectionDisabled ? 'none' : 'auto'}
          style={[
            styles.section,
            {
              backgroundColor: theme.background.card,
              borderColor: theme.border.light,
              opacity: businessSectionDisabled ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Building2 size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {isEmployee ? 'Assigned Business' : t('settings.businessProfile')}
            </Text>
          </View>
          {isEmployee && (
            <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>
              Assigned by the business owner. Contact your owner to update details.
            </Text>
          )}

          {/* Logo Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Business Logo
            </Text>
            <Text style={[styles.hint, { color: theme.text.tertiary }]}>
              Your logo will appear on all documents
            </Text>
            <View style={styles.logoContainer}>
              {logo ? (
                <View style={styles.logoPreview}>
                  <Image source={{ uri: logo }} style={styles.logoImage} />
                  <TouchableOpacity
                    style={[styles.removeLogoButton, { backgroundColor: theme.surface.danger }]}
                    onPress={handleRemoveLogo}
                  >
                    <X size={16} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.logoUploadButton, { 
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.light,
                  }]}
                  onPress={handlePickImage}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <ActivityIndicator color={theme.accent.primary} />
                  ) : (
                    <>
                      <ImageIcon size={24} color={theme.accent.primary} />
                      <Text style={[styles.logoUploadText, { color: theme.text.secondary }]}>
                        Upload Logo
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Business Name *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={name}
              onChangeText={setName}
              placeholder="Business name"
              placeholderTextColor={theme.text.tertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Owner Name *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={owner}
              onChangeText={setOwner}
              placeholder="Owner name"
              placeholderTextColor={theme.text.tertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Phone Number
            </Text>
            <View style={[styles.inputWithIcon, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}>
              <Phone size={16} color={theme.text.tertiary} />
              <TextInput
                style={[styles.inputWithIconField, { color: theme.text.primary }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+263..."
                placeholderTextColor={theme.text.tertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Email Address
            </Text>
            <View style={[styles.inputWithIcon, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}>
              <Mail size={16} color={theme.text.tertiary} />
              <TextInput
                style={[styles.inputWithIconField, { color: theme.text.primary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="business@example.com"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Address
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Street address, building, etc."
              placeholderTextColor={theme.text.tertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Location *
            </Text>
            <View style={[styles.inputWithIcon, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}>
              <MapPin size={16} color={theme.text.tertiary} />
              <TextInput
                style={[styles.inputWithIconField, { color: theme.text.primary }]}
                value={location}
                onChangeText={setLocation}
                placeholder="City, Area"
                placeholderTextColor={theme.text.tertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Business Stage *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stageRow}
            >
              {businessStages.map((stageOption) => (
                <TouchableOpacity
                  key={stageOption.value}
                  style={[
                    styles.stageChip,
                    {
                      backgroundColor: stage === stageOption.value ? theme.accent.primary : theme.background.secondary,
                      borderColor: stage === stageOption.value ? theme.accent.primary : theme.border.light,
                    },
                  ]}
                  onPress={() => setStage(stageOption.value)}
                >
                  <Text
                    style={[
                      styles.stageChipText,
                      { color: stage === stageOption.value ? '#FFF' : theme.text.primary },
                    ]}
                  >
                    {stageOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedStage && (
              <Text style={[styles.stageHint, { color: theme.text.tertiary }]}>
                {selectedStage.desc}
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Starting Capital *
            </Text>
            <View style={styles.currencyRow}>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: currency === 'USD' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => setCurrency('USD')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: currency === 'USD' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  USD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyButton,
                  { 
                    borderColor: theme.border.light,
                    backgroundColor: currency === 'ZWL' ? theme.accent.primary : theme.background.secondary,
                  },
                ]}
                onPress={() => setCurrency('ZWL')}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    { color: currency === 'ZWL' ? '#FFF' : theme.text.secondary },
                  ]}
                >
                  ZWL
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={capital}
              onChangeText={setCapital}
              placeholder="0.00"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} 
            onPress={handleSaveProfile}
          >
            <Save size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Exchange Rate
            </Text>
          </View>

          <View style={[styles.rateCard, { 
            backgroundColor: theme.surface.info,
            borderColor: theme.accent.info,
          }]}>
            <Text style={[styles.rateLabel, { color: theme.text.secondary }]}>
              Current Rate
            </Text>
            <Text style={[styles.rateValue, { color: theme.accent.info }]}>
              $1 = ZWL {exchangeRate.usdToZwl.toLocaleString()}
            </Text>
            <Text style={[styles.rateDate, { color: theme.text.tertiary }]}>
              Last updated: {formatDate(exchangeRate.lastUpdated)}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Update Exchange Rate
            </Text>
            <Text style={[styles.hint, { color: theme.text.tertiary }]}>
              1 USD = ? ZWL
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={rate}
              onChangeText={setRate}
              placeholder="25000"
              placeholderTextColor={theme.text.tertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity 
            style={[styles.updateButton, { backgroundColor: theme.accent.success }]} 
            onPress={handleUpdateRate}
          >
            <Text style={styles.updateButtonText}>Update Rate</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Business Tools
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.toolButton, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}
            onPress={() => router.push('/business-plan' as any)}
          >
            <View style={styles.toolLeft}>
              <FileText size={24} color={theme.accent.primary} />
              <View>
                <Text style={[styles.toolTitle, { color: theme.text.primary }]}>
                  Business Plan Generator
                </Text>
                <Text style={[styles.toolDesc, { color: theme.text.secondary }]}>
                  Generate a complete business plan
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Data Export
            </Text>
          </View>

          <Text style={[styles.settingDesc, { color: theme.text.secondary, marginBottom: 16 }]}>
            Export all your business data for backup or analysis
          </Text>
          {!canManageData && (
            <Text style={[styles.settingDesc, { color: theme.text.tertiary, marginBottom: 12 }]}>
              Only the business owner can export or import data.
            </Text>
          )}

          <View style={styles.exportButtons}>
            <TouchableOpacity 
              style={[styles.exportButton, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
              }]}
              onPress={() => handleExportData('csv')}
              disabled={!canManageData}
            >
              <Download size={20} color={theme.accent.primary} />
              <Text style={[styles.exportButtonText, { color: theme.text.primary }]}>
                Export CSV
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.exportButton, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
              }]}
              onPress={() => handleExportData('json')}
              disabled={!canManageData}
            >
              <Download size={20} color={theme.accent.primary} />
              <Text style={[styles.exportButtonText, { color: theme.text.primary }]}>
                Export JSON
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.importSection}>
            <Text style={[styles.settingDesc, { color: theme.text.secondary }]}>
              Import a previous JSON export to restore your data
            </Text>
            <TouchableOpacity 
              style={[styles.importButton, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
              }]}
              onPress={handleImportData}
              disabled={isImportingData || !canManageData}
            >
              {isImportingData ? (
                <ActivityIndicator color={theme.accent.primary} />
              ) : (
                <>
                  <Upload size={20} color={theme.accent.primary} />
                  <Text style={[styles.exportButtonText, { color: theme.text.primary }]}>
                    Import JSON
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              Legal
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.toolButton, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}
            onPress={() => router.push('/legal/terms' as any)}
          >
            <View style={styles.toolLeft}>
              <FileText size={22} color={theme.accent.primary} />
              <View>
                <Text style={[styles.toolTitle, { color: theme.text.primary }]}>
                  Terms & Conditions
                </Text>
                <Text style={[styles.toolDesc, { color: theme.text.secondary }]}>
                  View our terms of service
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toolButton, { 
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
            }]}
            onPress={() => router.push('/legal/privacy-policy' as any)}
          >
            <View style={styles.toolLeft}>
              <FileText size={22} color={theme.accent.primary} />
              <View>
                <Text style={[styles.toolTitle, { color: theme.text.primary }]}>
                  Privacy Policy
                </Text>
                <Text style={[styles.toolDesc, { color: theme.text.secondary }]}>
                  How we handle your data
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {isSuperAdmin && (
          <View style={[styles.section, { 
            backgroundColor: theme.background.card,
            borderColor: theme.border.light,
            marginBottom: 20,
          }]}>
            <View style={styles.sectionHeader}>
              <SettingsIcon size={20} color={theme.accent.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                Super Admin
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.toolButton, { 
                backgroundColor: theme.accent.primary,
                borderColor: theme.accent.primary,
              }]}
              onPress={() => router.push('/admin/dashboard' as any)}
            >
              <View style={styles.toolLeft}>
                <SettingsIcon size={24} color="#FFF" />
                <View>
                  <Text style={[styles.toolTitle, { color: '#FFF' }]}>
                    Admin Console
                  </Text>
                  <Text style={[styles.toolDesc, { color: '#FFF', opacity: 0.9 }]}>
                    Manage features, products, ads, and templates
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        </>
        )}

        <TouchableOpacity
          style={[styles.signOutButton, { 
            backgroundColor: theme.surface.danger,
            borderColor: theme.accent.danger,
          }]}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={theme.accent.danger} />
          <Text style={[styles.signOutText, { color: theme.accent.danger }]}>
            Sign Out
          </Text>
        </TouchableOpacity>

        <View style={[styles.infoSection, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <Text style={[styles.infoTitle, { color: theme.text.primary }]}>
            About DreamBig Business OS
          </Text>
          <Text style={[styles.infoText, { color: theme.text.secondary }]}>
            Version 1.0.0
          </Text>
          <Text style={[styles.infoText, { color: theme.text.secondary }]}>
            All data is stored locally on your device.
          </Text>
          <Text style={[styles.infoText, { color: theme.text.secondary }]}>
            Built for DreamBig customers in Zimbabwe.
          </Text>
        </View>
      </ScrollView>

      {/* Book Selection Modal */}
      <Modal
        visible={showBookModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bookModalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Select DreamBig Book
              </Text>
              <TouchableOpacity onPress={() => setShowBookModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: theme.text.secondary }]}>
              Your book unlocks specialized tools and guidance
            </Text>

            <ScrollView style={styles.booksScrollView} showsVerticalScrollIndicator={false}>
              {isLoadingBooks && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.text.secondary }}>Loading books...</Text>
                </View>
              )}
              
              {/* Hardcoded books */}
              {DREAMBIG_BOOKS.map((book) => {
                const isSelected = business?.dreamBigBook === book.id;
                const features = getBookFeatures(book.id);
                return (
                  <TouchableOpacity
                    key={book.id}
                    style={[
                      styles.bookModalCard,
                      {
                        backgroundColor: isSelected ? book.color + '10' : '#FFFFFF',
                        borderColor: isSelected ? book.color : '#E5E7EB',
                      },
                    ]}
                    onPress={() => handleBookChange(book.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bookModalHeader}>
                      <View style={styles.bookModalLeft}>
                        <View style={[styles.bookColorDotLarge, { backgroundColor: book.color }]} />
                        <View>
                          <Text style={[styles.bookModalTitle, { color: book.color }]}>
                            {book.title}
                          </Text>
                          <Text style={[styles.bookModalSubtitle, { color: '#64748B' }]}>
                            {book.subtitle}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.bookCheckCircle, { backgroundColor: book.color }]} />
                      )}
                    </View>
                    <Text 
                      style={[styles.bookModalDescription, { color: '#64748B' }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {book.description}
                    </Text>
                    <View style={styles.bookFeaturesContainer}>
                      <Text style={[styles.bookFeaturesTitle, { color: theme.text.primary }]}>
                        Unlocks {features.length} features:
                      </Text>
                      <View style={styles.bookFeaturesGrid}>
                        {features.map((feature, idx) => (
                          <View key={idx} style={[styles.bookFeatureTag, { backgroundColor: book.color }]}>
                            <Zap size={12} color="#FFF" />
                            <Text style={[styles.bookFeatureText, { color: '#FFF' }]}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Database books (excluding those already in hardcoded list) */}
              {databaseBooks
                .filter(dbBook => !DREAMBIG_BOOKS.some(hb => hb.id === dbBook.slug))
                .map((dbBook) => {
                  const isSelected = business?.dreamBigBook === dbBook.slug;
                  const bookColor = dbBook.isFeatured ? '#0066CC' : '#64748B';
                  const featureIds = dbBook.enabledFeatures || [];
                  // Map feature IDs to display names
                  const featureNames = featureIds
                    .map(id => {
                      const feature = featureConfigs.find(f => f.featureId === id);
                      return feature ? feature.name : id;
                    })
                    .filter(Boolean);
                  return (
                    <TouchableOpacity
                      key={dbBook.id}
                      style={[
                        styles.bookModalCard,
                        {
                          backgroundColor: isSelected ? bookColor + '10' : '#FFFFFF',
                          borderColor: isSelected ? bookColor : '#E5E7EB',
                        },
                      ]}
                      onPress={() => handleBookChange(dbBook.slug as DreamBigBook)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.bookModalHeader}>
                        <View style={styles.bookModalLeft}>
                          <View style={[styles.bookColorDotLarge, { backgroundColor: bookColor }]} />
                          <View>
                            <Text style={[styles.bookModalTitle, { color: bookColor }]}>
                              {dbBook.title}
                            </Text>
                            <Text style={[styles.bookModalSubtitle, { color: '#64748B' }]}>
                              {dbBook.subtitle || 'DreamBig Book'}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <View style={[styles.bookCheckCircle, { backgroundColor: bookColor }]} />
                        )}
                      </View>
                      <Text 
                        style={[styles.bookModalDescription, { color: '#64748B' }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {dbBook.description || 'A DreamBig book to help you grow your business'}
                      </Text>
                      {featureNames.length > 0 && (
                        <View style={styles.bookFeaturesContainer}>
                          <Text style={[styles.bookFeaturesTitle, { color: theme.text.primary }]}>
                            Unlocks {featureNames.length} features:
                          </Text>
                          <View style={styles.bookFeaturesGrid}>
                            {featureNames.map((featureName, idx) => (
                              <View key={idx} style={[styles.bookFeatureTag, { backgroundColor: bookColor }]}>
                                <Zap size={12} color="#FFF" />
                                <Text style={[styles.bookFeatureText, { color: '#FFF' }]}>
                                  {featureName}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  employeeInfoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  employeeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeInfoLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  employeeInfoValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  section: {
    marginBottom: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  stageRow: {
    paddingVertical: 4,
  },
  stageChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginRight: 8,
  },
  stageChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  stageHint: {
    fontSize: 12,
    marginTop: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  inputWithIconField: {
    flex: 1,
    fontSize: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  currencyButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  rateCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  rateLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  rateDate: {
    fontSize: 12,
  },
  updateButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toolLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  toolDesc: {
    fontSize: 13,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoSection: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  importSection: {
    marginTop: 16,
    gap: 10,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoContainer: {
    marginTop: 8,
  },
  logoPreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeLogoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoUploadButton: {
    width: 120,
    height: 120,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoUploadText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  bookInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  featureMoreText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bookModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  booksScrollView: {
    maxHeight: 600,
  },
  bookModalCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  bookModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookModalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bookColorDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  bookModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  bookModalSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  bookCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  bookModalDescription: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  bookFeaturesContainer: {
    marginTop: 8,
  },
  bookFeaturesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  bookFeaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bookFeatureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookFeatureText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
