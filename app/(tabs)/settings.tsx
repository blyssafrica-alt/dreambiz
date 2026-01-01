import { Stack, router } from 'expo-router';
import { DollarSign, Building2, MapPin, Phone, Mail, Save, FileText, Moon, Sun, LogOut, Download, Database, Image as ImageIcon, X, Settings as SettingsIcon, MessageSquare, Bell, Globe, CheckCircle, XCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import type { Currency } from '@/types/business';
import { exportAllData, shareData } from '@/lib/data-export';

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
  } = useBusiness();
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut, user, isSuperAdmin } = useAuth();
  const { 
    settings, 
    updateNotificationPreference, 
    updateLanguage, 
    updateCurrencyPreference, 
    updateIntegrationPreference,
    isLoading: settingsLoading 
  } = useSettings();
  const { t } = useTranslation();
  const [name, setName] = useState(business?.name || '');
  const [owner, setOwner] = useState(business?.owner || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [email, setEmail] = useState(business?.email || '');
  const [address, setAddress] = useState(business?.address || '');
  const [location, setLocation] = useState(business?.location || '');
  const [capital, setCapital] = useState(business?.capital.toString() || '');
  const [currency, setCurrency] = useState<Currency>(business?.currency || 'USD');
  const [rate, setRate] = useState(exchangeRate.usdToZwl.toString());
  const [logo, setLogo] = useState<string | undefined>(business?.logo);

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
      setLogo(business.logo);
    }
  }, [business]);

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
        if (asset.base64) {
          try {
            const base64 = asset.base64;
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `business-logo-${business?.id || 'temp'}-${Date.now()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error } = await supabase.storage
              .from('business_logos')
              .upload(filePath, decode(base64), {
                contentType: asset.mimeType || 'image/jpeg',
                upsert: true, // Allow overwriting existing logo
              });

            if (error) {
              if (error.message.includes('Bucket not found')) {
                RNAlert.alert('Storage Error', 'Business logos bucket not found. Please create a "business_logos" bucket in Supabase Storage.');
                return;
              }
              throw error;
            }

            const { data: publicUrlData } = supabase.storage
              .from('business_logos')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              setLogo(publicUrlData.publicUrl);
            }
          } catch (error: any) {
            console.error('Error uploading logo:', error);
            RNAlert.alert('Upload Error', error.message || 'Failed to upload logo');
          }
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
        logo,
      });

      RNAlert.alert('Success', 'Profile updated successfully. All documents will now use the updated information.');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update profile');
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
            await signOut();
            router.replace('/landing' as any);
          },
        },
      ]
    );
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

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background.secondary }]} 
        contentContainerStyle={styles.content}
      >
        <View style={[styles.userCard, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
        }]}>
          <View style={[styles.userAvatar, { backgroundColor: theme.surface.info }]}>
            <Text style={[styles.userAvatarText, { color: theme.accent.info }]}>
              {user?.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text.primary }]}>
              {user?.name}
            </Text>
            <Text style={[styles.userEmail, { color: theme.text.secondary }]}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { 
          backgroundColor: theme.background.card,
          borderColor: theme.border.light,
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
          <View style={[styles.settingRow, { marginTop: 16 }]}>
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
            <Building2 size={20} color={theme.accent.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {t('settings.businessProfile')}
            </Text>
          </View>

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
                >
                  <ImageIcon size={24} color={theme.accent.primary} />
                  <Text style={[styles.logoUploadText, { color: theme.text.secondary }]}>
                    Upload Logo
                  </Text>
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

          <View style={styles.exportButtons}>
            <TouchableOpacity 
              style={[styles.exportButton, { 
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
              }]}
              onPress={() => handleExportData('csv')}
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
            >
              <Download size={20} color={theme.accent.primary} />
              <Text style={[styles.exportButtonText, { color: theme.text.primary }]}>
                Export JSON
              </Text>
            </TouchableOpacity>
          </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 110,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
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
  section: {
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
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
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputWithIconField: {
    flex: 1,
    fontSize: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  currencyButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
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
    height: 52,
    borderRadius: 12,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  rateCard: {
    padding: 20,
    borderRadius: 16,
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
    height: 52,
    borderRadius: 12,
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
    padding: 16,
    borderRadius: 12,
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
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoSection: {
    padding: 20,
    borderRadius: 16,
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
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
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
    borderRadius: 12,
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
});
