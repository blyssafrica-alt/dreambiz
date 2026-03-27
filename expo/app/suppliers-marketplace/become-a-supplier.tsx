import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Image as ImageIcon,
  CheckCircle,
  Package,
  Edit3,
} from 'lucide-react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { WizardProgress } from '@/components/wizard';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage, readBase64FromUri } from '@/lib/upload-utils';
import {
  useOrCreateSupplierApplication,
  useUpsertSupplierApplicationDraft,
  useSubmitSupplierApplication,
  type SupplierApplicationPayload,
} from '@/hooks/useSupplierApplication';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

const BUCKET_SUPPLIER_ASSETS = 'supplier_assets';
const BUCKET_SUPPLIER_DOCS = 'supplier_assets';
const TOTAL_STEPS = 8;
const AUTOSAVE_DEBOUNCE_MS = 800;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function BecomeASupplierScreen() {
  const { theme } = useTheme();
  const { isFeatureVisible } = useFeatures();
  const { user } = useAuth();
  const { isEmployee } = useBusiness();
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [understandReview, setUnderstandReview] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [categoryFocus, setCategoryFocus] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [companyRegUrl, setCompanyRegUrl] = useState<string | null>(null);
  const [companyRegName, setCompanyRegName] = useState<string | null>(null);
  const [proofOfResidenceUrl, setProofOfResidenceUrl] = useState<string | null>(null);
  const [proofOfResidenceName, setProofOfResidenceName] = useState<string | null>(null);
  const [uploadingCompanyReg, setUploadingCompanyReg] = useState(false);
  const [uploadingProofOfResidence, setUploadingProofOfResidence] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<{ status: string } | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [draftApplicationId, setDraftApplicationId] = useState<string | null>(null);
  const resumePromptShown = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAccess = isFeatureVisible('supplier-marketplace');
  const orCreateQuery = useOrCreateSupplierApplication(canAccess && !isEmployee ? user?.id : undefined);
  const upsertDraftMutation = useUpsertSupplierApplicationDraft(user?.id);
  const submitApplicationMutation = useSubmitSupplierApplication(user?.id);
  const applicationsFlow = !orCreateQuery.isError && !!user?.id && canAccess && !isEmployee;
  const singleApplication = orCreateQuery.data;

  useEffect(() => {
    if (!user?.id || !canAccess) {
      setCheckingExisting(false);
      return;
    }
    const check = async () => {
      const { data: profile } = await supabase
        .from('supplier_marketplace_profiles')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (profile) {
        setExistingApplication({ status: profile.status });
        setCheckingExisting(false);
        return;
      }
      const { data: appRow, error: appErr } = await supabase
        .from('supplier_applications')
        .select('status')
        .eq('owner_user_id', user.id)
        .in('status', ['submitted', 'pending', 'needs_info'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingApplication(!appErr && appRow ? { status: appRow.status } : null);
      setCheckingExisting(false);
    };
    check();
  }, [user?.id, canAccess]);

  useEffect(() => {
    const app = singleApplication;
    if (!app || !applicationsFlow) return;
    if (app.status === 'submitted' || app.status === 'pending') {
      router.replace('/suppliers-marketplace/my-application' as any);
      return;
    }
    if (app.status === 'approved') {
      router.replace('/supplier' as any);
      return;
    }
    if (app.status === 'declined') {
      router.replace('/suppliers-marketplace/my-application' as any);
      return;
    }
    if (app.status === 'draft' || app.status === 'needs_info') {
      if (!resumePromptShown.current) {
        resumePromptShown.current = true;
        setDraftApplicationId(app.id);
        hydrateFromDraft(app.payload, app.current_step);
      }
    }
  }, [singleApplication, applicationsFlow, router]);

  function hydrateFromDraft(payload: SupplierApplicationPayload, savedStep?: number) {
    if (payload.step0) {
      setUnderstandReview(!!payload.step0.understandReview);
      setAgreeTerms(!!payload.step0.agreeTerms);
    }
    if (payload.step1) {
      if (payload.step1.display_name !== undefined) setBusinessName(payload.step1.display_name);
      if (payload.step1.country !== undefined) setCountry(payload.step1.country);
      if (payload.step1.city !== undefined) setCity(payload.step1.city);
      if (payload.step1.address !== undefined) setAddress(payload.step1.address);
      if (payload.step1.registration_number !== undefined) setRegistrationNumber(payload.step1.registration_number);
      if (payload.step1.legal_name !== undefined) setLegalName(payload.step1.legal_name ?? '');
      if (payload.step1.tax_id !== undefined) setTaxId(payload.step1.tax_id ?? '');
    }
    if (payload.step2?.product_keywords?.length) {
      setCategoryFocus(payload.step2.product_keywords.join(', '));
    }
    if (payload.step3) {
      if (payload.step3.phone !== undefined) setPhone(payload.step3.phone);
      if (payload.step3.whatsapp !== undefined) setWhatsapp(payload.step3.whatsapp);
      if (payload.step3.email !== undefined) setEmail(payload.step3.email);
      if (payload.step3.website !== undefined) setWebsite(payload.step3.website);
    }
    if (payload.step4) {
      if (payload.step4.about_description !== undefined) setDescription(payload.step4.about_description);
      if (payload.step4.logo_url !== undefined) setLogoUrl(payload.step4.logo_url);
      if (payload.step4.cover_url !== undefined) setCoverUrl(payload.step4.cover_url);
    }
    if (payload.step5) {
      setTermsAccepted(!!payload.step5.accept_supplier_rules);
      if (payload.step5.doc_urls?.company_registration) setCompanyRegUrl(payload.step5.doc_urls.company_registration);
      if (payload.step5.doc_urls?.proof_of_residence) setProofOfResidenceUrl(payload.step5.doc_urls.proof_of_residence);
    }
    const maxStep = payload.step6 ? 7 : payload.step5 ? 6 : payload.step4 ? 5 : payload.step3 ? 4 : payload.step2 ? 3 : payload.step1 ? 2 : 1;
    setStep(savedStep != null ? Math.min(Math.max(0, savedStep), 7) : Math.min(maxStep, 7));
  }

  const buildPayloadFromForm = useCallback((): SupplierApplicationPayload => ({
    step0: { understandReview, agreeTerms },
    step1: {
      display_name: businessName.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      registration_number: registrationNumber.trim() || undefined,
      legal_name: legalName.trim() || undefined,
      tax_id: taxId.trim() || undefined,
    },
    step2: {
      selected_category_ids: [],
      product_keywords: categoryFocus.trim() ? [categoryFocus.trim()] : undefined,
    },
    step3: {
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
    },
    step4: {
      logo_url: logoUrl || undefined,
      cover_url: coverUrl || undefined,
      about_description: description.trim() || undefined,
    },
    step5: {
      doc_urls: [companyRegUrl, proofOfResidenceUrl].filter(Boolean).length
        ? { ...(companyRegUrl && { company_registration: companyRegUrl }), ...(proofOfResidenceUrl && { proof_of_residence: proofOfResidenceUrl }) }
        : undefined,
      accept_supplier_rules: termsAccepted,
      can_provide_invoices: undefined,
    },
  }), [understandReview, agreeTerms, businessName, country, city, address, registrationNumber, legalName, taxId, categoryFocus, phone, whatsapp, email, website, logoUrl, coverUrl, description, companyRegUrl, proofOfResidenceUrl, termsAccepted]);

  const buildDenormalized = useCallback(() => {
    const docUrls: Record<string, string> = {};
    if (companyRegUrl) docUrls.company_registration = companyRegUrl;
    if (proofOfResidenceUrl) docUrls.proof_of_residence = proofOfResidenceUrl;
    return {
      display_name: businessName.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      address: address.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      website: website.trim() || null,
      registration_number: registrationNumber.trim() || null,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
      about_description: description.trim() || null,
      accept_supplier_rules: termsAccepted,
      ...(categoryFocus.trim() ? { product_keywords: [categoryFocus.trim()] } : {}),
      ...(Object.keys(docUrls).length ? { doc_urls: docUrls } : {}),
    };
  }, [businessName, country, city, address, email, phone, whatsapp, website, registrationNumber, logoUrl, coverUrl, description, termsAccepted, categoryFocus, companyRegUrl, proofOfResidenceUrl]);

  useEffect(() => {
    if (!applicationsFlow || step === 0 || submitting) return;
    const timer = autosaveTimer.current;
    if (timer) clearTimeout(timer);
    autosaveTimer.current = setTimeout(async () => {
      const payload = buildPayloadFromForm();
      const denormalized = buildDenormalized();
      try {
        const id = await upsertDraftMutation.mutateAsync({
          id: draftApplicationId ?? undefined,
          payload,
          denormalized,
          currentStep: step,
        });
        if (!draftApplicationId) setDraftApplicationId(id);
      } catch (_) {}
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [applicationsFlow, step, buildPayloadFromForm, buildDenormalized, draftApplicationId, submitting, upsertDraftMutation]);

  const pickDocument = async (docType: 'company_registration' | 'proof_of_residence') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      if (docType === 'company_registration') setUploadingCompanyReg(true);
      else setUploadingProofOfResidence(true);
      try {
        const base64 = await readBase64FromUri(file.uri);
        const name = file.name || `doc-${Date.now()}.${file.mimeType?.includes('pdf') ? 'pdf' : 'jpg'}`;
        const ext = name.split('.').pop()?.toLowerCase() || 'pdf';
        const filePath = `application_docs/${docType}/${Date.now()}-${name.replace(/[^a-z0-9.-]/gi, '-')}`;
        const contentType = file.mimeType || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
        const url = await uploadBase64ToStorage(supabase, {
          bucket: BUCKET_SUPPLIER_DOCS,
          filePath,
          base64,
          contentType,
          upsert: false,
        });
        if (docType === 'company_registration') {
          setCompanyRegUrl(url);
          setCompanyRegName(name);
        } else {
          setProofOfResidenceUrl(url);
          setProofOfResidenceName(name);
        }
      } catch (e: any) {
        RNAlert.alert('Upload failed', e?.message || 'Could not upload document.');
      } finally {
        if (docType === 'company_registration') setUploadingCompanyReg(false);
        else setUploadingProofOfResidence(false);
      }
    } catch (e: any) {
      if (docType === 'company_registration') setUploadingCompanyReg(false);
      else setUploadingProofOfResidence(false);
      RNAlert.alert('Error', e?.message || 'Could not pick document.');
    }
  };

  const pickImage = async (type: 'logo' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please allow access to your photos to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (type === 'logo') {
        setLogoUri(asset.uri);
        setUploadingLogo(true);
      } else {
        setCoverUri(asset.uri);
        setUploadingCover(true);
      }

      const base64 = await getBase64FromAsset(asset);
      const fileName = buildAssetFileName(asset, type === 'logo' ? 'supplier-logo' : 'supplier-cover');
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${type === 'logo' ? 'logos' : 'covers'}/${Date.now()}-${fileName}`;
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      const contentType = mimeMap[fileExt] || 'image/jpeg';

      const publicUrl = await uploadBase64ToStorage(supabase, {
        bucket: BUCKET_SUPPLIER_ASSETS,
        filePath,
        base64,
        contentType,
        upsert: false,
      });

      if (type === 'logo') {
        setLogoUrl(publicUrl);
        setUploadingLogo(false);
      } else {
        setCoverUrl(publicUrl);
        setUploadingCover(false);
      }
    } catch (e: any) {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingCover(false);
      RNAlert.alert('Upload failed', e?.message || 'Could not upload image.');
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!understandReview || !agreeTerms) return 'Please accept both statements to continue.';
      return null;
    }
    if (s === 1) return null;
    if (s === 2) {
      if (!businessName.trim()) return 'Business name is required.';
      return null;
    }
    if (s === 3) {
      if (!country.trim()) return 'Country is required.';
      return null;
    }
    if (s === 4) {
      if (!email.trim()) return 'Email is required.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email.trim())) return 'Please enter a valid email.';
      return null;
    }
    if (s === 5) return null;
    if (s === 6) return null;
    if (s === 7) {
      if (!termsAccepted) return 'You must accept the terms to submit.';
      return null;
    }
    return null;
  };

  const goNext = () => {
    setStepError(null);
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    if (applicationsFlow && step > 0 && step < 7) {
      const payload = buildPayloadFromForm();
      const denormalized = buildDenormalized();
      upsertDraftMutation.mutateAsync({ id: draftApplicationId ?? undefined, payload, denormalized }).then((id) => {
        if (!draftApplicationId) setDraftApplicationId(id);
      }).catch(() => {});
    }
    if (step < 7) setStep(step + 1);
  };

  const goBack = () => {
    if (step === 0) router.back();
    else setStep(step - 1);
  };

  const handleSaveAndExit = async () => {
    if (!applicationsFlow) {
      router.back();
      return;
    }
    const payload = buildPayloadFromForm();
    const denormalized = buildDenormalized();
    try {
      const id = await upsertDraftMutation.mutateAsync({ id: draftApplicationId ?? undefined, payload, denormalized });
      if (!draftApplicationId) setDraftApplicationId(id);
      RNAlert.alert('', t('supplierApplication.saveAndExit'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      RNAlert.alert('Error', 'Could not save draft.');
    }
  };

  const handleSubmit = async () => {
    setStepError(null);
    const err = validateStep(7);
    if (err) {
      setStepError(err);
      return;
    }

    const trimmedName = businessName.trim();
    const trimmedEmail = email.trim();

    if (applicationsFlow) {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
      setSubmitting(true);
      try {
        const payload = buildPayloadFromForm();
        const denormalized = buildDenormalized();
        let applicationId = draftApplicationId ?? singleApplication?.id;
        if (!applicationId) {
          applicationId = await upsertDraftMutation.mutateAsync({
            id: undefined,
            payload,
            denormalized,
          });
          setDraftApplicationId(applicationId);
        }
        await submitApplicationMutation.mutateAsync({
          applicationId,
          finalPayload: payload,
          denormalized,
          userId: user?.id,
        });
        RNAlert.alert(
          t('supplierApplication.applicationSubmitted'),
          t('supplierApplication.underReview'),
          [{ text: 'OK', onPress: () => router.replace('/suppliers-marketplace' as any) }]
        );
      } catch (e: any) {
        const msg = e?.message ?? '';
        if (msg === 'ALREADY_SUBMITTED') {
          RNAlert.alert(
            t('supplierApplication.applicationSubmitted'),
            'Your application has already been submitted. You will be notified when it is reviewed.',
            [{ text: 'OK', onPress: () => router.replace('/suppliers-marketplace' as any) }]
          );
        } else {
          RNAlert.alert('Error', msg || 'Failed to submit application.');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      let slug = slugify(trimmedName);
      const { data: existingSlug } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

      const basePayload = {
        user_id: user!.id,
        business_name: trimmedName,
        slug,
        category_focus: categoryFocus.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        address: address.trim() || null,
        email: trimmedEmail,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        description: description.trim() || null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
        status: 'pending',
      };
      const extendedPayload = {
        ...basePayload,
        terms_accepted_at: new Date().toISOString(),
        legal_name: legalName.trim() || null,
        registration_number: registrationNumber.trim() || null,
        tax_id: taxId.trim() || null,
        website: website.trim() || null,
        company_email: companyEmail.trim() || null,
      };

      const { data: insertedProfile, error } = await supabase
        .from('supplier_marketplace_profiles')
        .insert(extendedPayload as any)
        .select('id')
        .single();
      if (error) {
        if (error?.message?.includes('column') && (error.message.includes('legal_name') || error.message.includes('terms_accepted_at') || error.message.includes('website'))) {
          const { data: fallback, error: err2 } = await supabase
            .from('supplier_marketplace_profiles')
            .insert(basePayload as any)
            .select('id')
            .single();
          if (err2) throw err2;
          if (fallback?.id && (companyRegUrl || proofOfResidenceUrl)) {
            const docs: { supplier_profile_id: string; document_type: string; file_url: string; file_name: string | null }[] = [];
            if (companyRegUrl) docs.push({ supplier_profile_id: fallback.id, document_type: 'company_registration', file_url: companyRegUrl, file_name: companyRegName });
            if (proofOfResidenceUrl) docs.push({ supplier_profile_id: fallback.id, document_type: 'proof_of_residence', file_url: proofOfResidenceUrl, file_name: proofOfResidenceName });
            if (docs.length) {
              try {
                await supabase.from('supplier_verification_documents').insert(docs);
              } catch (_) {}
            }
          }
          RNAlert.alert('Application submitted', 'Your application has been sent. An admin will review it and you will be notified when it is approved or if more information is needed.', [{ text: 'OK', onPress: () => router.replace('/suppliers-marketplace' as any) }]);
          return;
        }
        throw error;
      }
      if (insertedProfile?.id && (companyRegUrl || proofOfResidenceUrl)) {
        const docs: { supplier_profile_id: string; document_type: string; file_url: string; file_name: string | null }[] = [];
        if (companyRegUrl) docs.push({ supplier_profile_id: insertedProfile.id, document_type: 'company_registration', file_url: companyRegUrl, file_name: companyRegName });
        if (proofOfResidenceUrl) docs.push({ supplier_profile_id: insertedProfile.id, document_type: 'proof_of_residence', file_url: proofOfResidenceUrl, file_name: proofOfResidenceName });
        await supabase.from('supplier_verification_documents').insert(docs);
      }

      RNAlert.alert(
        'Application submitted',
        'Your application has been sent. An admin will review it and you will be notified when it is approved or if more information is needed.',
        [{ text: 'OK', onPress: () => router.replace('/suppliers-marketplace' as any) }]
      );
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Access not available.</Text>
      </View>
    );
  }

  if (isEmployee) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader title={t('supplierApplication.title')} leftAction={<TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><ArrowLeft size={24} color={theme.text.primary} /></TouchableOpacity>} />
        <View style={[styles.section, { backgroundColor: theme.background.card, margin: spacing.md, padding: spacing.lg }]}>
          <Text style={[styles.bodyText, { color: theme.text.secondary }]}>Only business owners can apply to become a supplier. If you need access, ask your business owner.</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary, marginTop: spacing.md }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>{t('supplierApplication.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (checkingExisting) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Checking your application...</Text>
      </View>
    );
  }

  if (existingApplication) {
    if (existingApplication.status === 'approved') {
      return (
        <View style={[styles.centered, styles.statusCard, { backgroundColor: theme.background.secondary }]}>
          <CheckCircle size={48} color={theme.accent.success} strokeWidth={2} />
          <Text style={[styles.statusTitle, { color: theme.text.primary }]}>Already approved</Text>
          <Text style={[styles.statusBody, { color: theme.text.secondary }]}>You already have an approved supplier profile. Use Supplier Dashboard to manage your store.</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]} onPress={() => router.replace('/supplier' as any)} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Open Supplier Dashboard</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (existingApplication.status === 'pending' || existingApplication.status === 'submitted') {
      return (
        <View style={[styles.centered, styles.statusCard, { backgroundColor: theme.background.secondary }]}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.statusTitle, { color: theme.text.primary }]}>Application under review</Text>
          <Text style={[styles.statusBody, { color: theme.text.secondary }]}>You will be notified when it is approved or if we need more information.</Text>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border.medium }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={[styles.secondaryButtonText, { color: theme.text.primary }]}>Back to marketplace</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (existingApplication.status === 'needs_info') {
      return (
        <View style={[styles.centered, styles.statusCard, { backgroundColor: theme.background.secondary }]}>
          <Text style={[styles.statusTitle, { color: theme.text.primary }]}>More information needed</Text>
          <Text style={[styles.statusBody, { color: theme.text.secondary }]}>Complete the form again with the requested details.</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]} onPress={() => setExistingApplication(null)} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Continue application</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border.medium, marginTop: spacing.sm }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={[styles.secondaryButtonText, { color: theme.text.secondary }]}>Back to marketplace</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (existingApplication.status === 'declined' || existingApplication.status === 'suspended') {
      return (
        <View style={[styles.centered, styles.statusCard, { backgroundColor: theme.background.secondary }]}>
          <Text style={[styles.statusTitle, { color: theme.text.primary }]}>Application {existingApplication.status}</Text>
          <Text style={[styles.statusBody, { color: theme.text.secondary }]}>Contact support if you want to reapply or have questions.</Text>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.border.medium }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={[styles.secondaryButtonText, { color: theme.text.primary }]}>Back to marketplace</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  const stepTitles = [
    t('supplierApplication.step0Title'),
    'Welcome',
    'Business details',
    'Location',
    'Contact',
    'Documents & verification',
    'Store branding',
    'Review & submit',
  ];

  const inputStyle = [styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }];
  const placeholderColor = theme.text.tertiary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={t('supplierApplication.title')}
        subtitle={`${stepTitles[step]} (${step + 1}/${TOTAL_STEPS})`}
        icon={UserPlus}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={goBack}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.wizardWrap}>
        <WizardProgress step={step + 1} total={TOTAL_STEPS} stepTitles={stepTitles} />
      </View>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {stepError ? (
            <View style={[styles.inlineError, { backgroundColor: theme.surface.danger }]}>
              <Text style={[styles.inlineErrorText, { color: theme.accent.danger }]}>{stepError}</Text>
            </View>
          ) : null}
          {/* Step 0: Eligibility */}
          {step === 0 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('supplierApplication.step0Title')}</Text>
              <Text style={[styles.bodyText, { color: theme.text.secondary }]}>{t('supplierApplication.step0Intro')}</Text>
              <View style={styles.termsRow}>
                <Switch value={understandReview} onValueChange={setUnderstandReview} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
                <Text style={[styles.termsText, { color: theme.text.secondary }]}>{t('supplierApplication.understandReview')}</Text>
              </View>
              <View style={styles.termsRow}>
                <Switch value={agreeTerms} onValueChange={setAgreeTerms} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
                <Text style={[styles.termsText, { color: theme.text.secondary }]}>{t('supplierApplication.agreeTerms')}</Text>
              </View>
            </View>
          )}

          {/* Step 1: Welcome & how it works */}
          {step === 1 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>How it works</Text>
              <Text style={[styles.bodyText, { color: theme.text.secondary }]}>
                Complete this application in a few steps. Once approved, your storefront is created automatically and you can start selling.
              </Text>
              <View style={styles.guideBlock}>
                <View style={styles.guideRow}>
                  <CheckCircle size={20} color={theme.accent.primary} />
                  <Text style={[styles.guideTitle, { color: theme.text.primary }]}>Storefront</Text>
                </View>
                <Text style={[styles.guideBody, { color: theme.text.secondary }]}>
                  Your public store is created when your application is approved. You can edit your store name, logo, description, and contact details anytime from the dashboard under <Text style={{ fontWeight: '600' }}>My Store</Text>.
                </Text>
              </View>
              <View style={styles.guideBlock}>
                <View style={styles.guideRow}>
                  <Package size={20} color={theme.accent.primary} />
                  <Text style={[styles.guideTitle, { color: theme.text.primary }]}>Adding products</Text>
                </View>
                <Text style={[styles.guideBody, { color: theme.text.secondary }]}>
                  After approval, go to <Text style={{ fontWeight: '600' }}>Supplier Dashboard → My Products → Add product</Text>. Create your catalog; you can publish products once you have an active subscription.
                </Text>
              </View>
              <View style={styles.guideBlock}>
                <View style={styles.guideRow}>
                  <Edit3 size={20} color={theme.accent.primary} />
                  <Text style={[styles.guideTitle, { color: theme.text.primary }]}>Editing your store profile</Text>
                </View>
                <Text style={[styles.guideBody, { color: theme.text.secondary }]}>
                  Open <Text style={{ fontWeight: '600' }}>Supplier Dashboard → My Store</Text> to update business name, category, address, contact, description, logo, and cover image.
                </Text>
              </View>
              <Text style={[styles.bodyText, { color: theme.text.tertiary, marginTop: 8 }]}>
                You will need: business name, location, contact email, and optionally legal/registration details and store images.
              </Text>
            </View>
          )}

          {/* Step 2: Business details */}
          {step === 2 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Business information</Text>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Business name *</Text>
              <TextInput style={inputStyle} placeholder="e.g. Acme Trading" placeholderTextColor={placeholderColor} value={businessName} onChangeText={(v) => { setBusinessName(v); setStepError(null); }} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Legal name (as on registration)</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={legalName} onChangeText={setLegalName} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Registration number</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={registrationNumber} onChangeText={setRegistrationNumber} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Tax ID / VAT number</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={taxId} onChangeText={setTaxId} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Category focus</Text>
              <TextInput style={inputStyle} placeholder="e.g. Electronics, Groceries" placeholderTextColor={placeholderColor} value={categoryFocus} onChangeText={setCategoryFocus} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Business description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Brief description of your business"
                placeholderTextColor={placeholderColor}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Location</Text>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Country *</Text>
              <TextInput style={inputStyle} placeholder="e.g. South Africa" placeholderTextColor={placeholderColor} value={country} onChangeText={(v) => { setCountry(v); setStepError(null); }} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>City</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={city} onChangeText={setCity} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Region / State</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={region} onChangeText={setRegion} />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Street address</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Optional"
                placeholderTextColor={placeholderColor}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Contact</Text>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Email *</Text>
              <TextInput style={inputStyle} placeholder="you@example.com" placeholderTextColor={placeholderColor} value={email} onChangeText={(v) => { setEmail(v); setStepError(null); }} keyboardType="email-address" autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Phone</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>WhatsApp (with country code)</Text>
              <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={placeholderColor} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
            </View>
          )}

          {/* Step 5: Documents & verification */}
          {step === 5 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Documents & verification</Text>
              <Text style={[styles.bodyText, { color: theme.text.tertiary, marginBottom: spacing.sm }]}>Supporting documents help us verify your business. You can upload PDFs or images.</Text>
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Company email</Text>
              <TextInput style={inputStyle} placeholder="e.g. info@company.com" placeholderTextColor={placeholderColor} value={companyEmail} onChangeText={setCompanyEmail} keyboardType="email-address" autoCapitalize="none" />
              <Text style={[styles.fieldLabel, { color: theme.text.secondary }]}>Website</Text>
              <TextInput style={inputStyle} placeholder="https://yourcompany.com" placeholderTextColor={placeholderColor} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
              <TouchableOpacity style={[styles.imageButton, { backgroundColor: theme.background.secondary }]} onPress={() => pickDocument('company_registration')} disabled={uploadingCompanyReg}>
                {uploadingCompanyReg ? <ActivityIndicator size="small" color={theme.accent.primary} /> : (companyRegUrl ? <CheckCircle size={24} color={theme.accent.primary} /> : <ImageIcon size={24} color={theme.text.tertiary} />)}
                <View style={styles.attachLabelBlock}>
                  <Text style={[styles.imageButtonText, { color: theme.text.secondary }]}>
                    {companyRegUrl ? `Attached: ${companyRegName || 'Company registration document'}` : 'Company registration document'}
                  </Text>
                  {companyRegUrl ? <Text style={[styles.attachedHint, { color: theme.text.tertiary }]}>Tap to replace</Text> : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.imageButton, { backgroundColor: theme.background.secondary }]} onPress={() => pickDocument('proof_of_residence')} disabled={uploadingProofOfResidence}>
                {uploadingProofOfResidence ? <ActivityIndicator size="small" color={theme.accent.primary} /> : (proofOfResidenceUrl ? <CheckCircle size={24} color={theme.accent.primary} /> : <ImageIcon size={24} color={theme.text.tertiary} />)}
                <View style={styles.attachLabelBlock}>
                  <Text style={[styles.imageButtonText, { color: theme.text.secondary }]}>
                    {proofOfResidenceUrl ? `Attached: ${proofOfResidenceName || 'Proof of residence'}` : 'Proof of residence'}
                  </Text>
                  {proofOfResidenceUrl ? <Text style={[styles.attachedHint, { color: theme.text.tertiary }]}>Tap to replace</Text> : null}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 6: Store branding */}
          {step === 6 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Store images (optional)</Text>
              <Text style={[styles.bodyText, { color: theme.text.tertiary, marginBottom: 12 }]}>Add a logo and cover image for your store. You can change these later in My Store.</Text>
              <View style={styles.logoCoverRow}>
                <TouchableOpacity style={[styles.logoCoverBlock, { backgroundColor: theme.background.secondary }]} onPress={() => pickImage('logo')} disabled={uploadingLogo}>
                  {(logoUri || logoUrl) ? (
                    logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                      <StorageImage uri={logoUrl} bucket="supplier" style={styles.previewImage} resizeMode="contain" />
                    )
                  ) : uploadingLogo ? (
                    <ActivityIndicator size="small" color={theme.accent.primary} />
                  ) : (
                    <ImageIcon size={40} color={theme.text.tertiary} />
                  )}
                  <Text style={[styles.previewLabel, { color: theme.text.secondary }]}>{logoUri || logoUrl ? 'Logo uploaded' : 'Add logo'}</Text>
                  {(logoUri || logoUrl) ? <Text style={[styles.attachedHint, { color: theme.text.tertiary }]}>Tap to change</Text> : null}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.logoCoverBlock, { backgroundColor: theme.background.secondary }]} onPress={() => pickImage('cover')} disabled={uploadingCover}>
                  {(coverUri || coverUrl) ? (
                    coverUri ? (
                      <Image source={{ uri: coverUri }} style={styles.previewImage} resizeMode="cover" />
                    ) : (
                      <StorageImage uri={coverUrl} bucket="supplier" style={styles.previewImage} resizeMode="cover" />
                    )
                  ) : uploadingCover ? (
                    <ActivityIndicator size="small" color={theme.accent.primary} />
                  ) : (
                    <ImageIcon size={40} color={theme.text.tertiary} />
                  )}
                  <Text style={[styles.previewLabel, { color: theme.text.secondary }]}>{coverUri || coverUrl ? 'Cover uploaded' : 'Add cover'}</Text>
                  {(coverUri || coverUrl) ? <Text style={[styles.attachedHint, { color: theme.text.tertiary }]}>Tap to change</Text> : null}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 7: Review & submit */}
          {step === 7 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.secondary }]}>Review your application</Text>
              <ReviewLine label="Business name" value={businessName} theme={theme} />
              {(legalName || registrationNumber || taxId) && (
                <>
                  {legalName ? <ReviewLine label="Legal name" value={legalName} theme={theme} /> : null}
                  {registrationNumber ? <ReviewLine label="Registration no." value={registrationNumber} theme={theme} /> : null}
                  {taxId ? <ReviewLine label="Tax ID" value={taxId} theme={theme} /> : null}
                </>
              )}
              {categoryFocus ? <ReviewLine label="Category" value={categoryFocus} theme={theme} /> : null}
              <ReviewLine label="Country" value={country} theme={theme} />
              {city ? <ReviewLine label="City" value={city} theme={theme} /> : null}
              <ReviewLine label="Email" value={email} theme={theme} />
              {companyEmail ? <ReviewLine label="Company email" value={companyEmail} theme={theme} /> : null}
              {website ? <ReviewLine label="Website" value={website} theme={theme} /> : null}
              {phone ? <ReviewLine label="Phone" value={phone} theme={theme} /> : null}
              {whatsapp ? <ReviewLine label="WhatsApp" value={whatsapp} theme={theme} /> : null}
              {description ? <ReviewLine label="Description" value={description.slice(0, 80) + (description.length > 80 ? '…' : '')} theme={theme} /> : null}
              {(companyRegUrl || proofOfResidenceUrl) ? <ReviewLine label="Documents" value={[companyRegUrl && 'Company registration', proofOfResidenceUrl && 'Proof of residence'].filter(Boolean).join(', ')} theme={theme} /> : null}

              <View style={styles.termsRow}>
                <Switch value={termsAccepted} onValueChange={setTermsAccepted} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
                <Text style={[styles.termsText, { color: theme.text.secondary }]}>
                  I confirm the information is accurate and I accept the marketplace supplier terms and policies.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            {step === 0 ? (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]} onPress={goNext} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>{t('supplierApplication.startApplication')}</Text>
                <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : step < 7 ? (
              <>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]} onPress={goNext} activeOpacity={0.85}>
                  <Text style={styles.primaryButtonText}>{t('supplierApplication.continue')}</Text>
                  <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
                {applicationsFlow && (
                  <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.accent.primary, marginTop: spacing.sm }]} onPress={handleSaveAndExit} activeOpacity={0.85}>
                    <Text style={[styles.secondaryButtonText, { color: theme.accent.primary }]}>{t('supplierApplication.saveAndExit')}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent.primary, opacity: submitting ? 0.8 : 1 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
                  {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryButtonText}>{t('supplierApplication.submit')}</Text>}
                </TouchableOpacity>
                {applicationsFlow && (
                  <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.accent.primary, marginTop: spacing.sm }]} onPress={handleSaveAndExit} disabled={submitting} activeOpacity={0.85}>
                    <Text style={[styles.secondaryButtonText, { color: theme.accent.primary }]}>{t('supplierApplication.saveAndExit')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={{ height: spacing.lg }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewLine({ label, value, theme }: { label: string; value: string; theme: any }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: theme.text.tertiary }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: theme.text.primary }]} numberOfLines={2}>{value.trim()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  wizardWrap: { paddingHorizontal: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.md },
  stepDot: { height: 10, borderRadius: 5 },
  section: { padding: spacing.lg, borderRadius: radius.md, marginBottom: spacing.md },
  sectionTitle: { ...typography.cardTitle, marginBottom: spacing.sm },
  bodyText: { ...typography.bodySmall, lineHeight: 22, marginBottom: spacing.xs },
  fieldLabel: { ...typography.label, marginBottom: spacing.xxs, marginTop: spacing.sm },
  guideBlock: { marginTop: spacing.sm },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxs },
  guideTitle: { fontSize: 15, fontWeight: '600' },
  guideBody: { fontSize: 14, lineHeight: 20 },
  input: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
    minHeight: minTouchTarget,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.sm },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    minHeight: minTouchTarget,
  },
  imageButtonText: { fontSize: 15 },
  attachLabelBlock: { flex: 1 },
  attachedHint: { fontSize: 12, marginTop: 2 },
  logoCoverRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  logoCoverBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.md, minHeight: 140 },
  previewImage: { width: '100%', height: 80, borderRadius: radius.sm, marginBottom: spacing.xs },
  previewLabel: { fontSize: 14, fontWeight: '500' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  termsText: { flex: 1, fontSize: 14 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  reviewLabel: { ...typography.label },
  reviewValue: { fontSize: 14, flex: 1, marginLeft: spacing.xs, textAlign: 'right' },
  footer: { marginTop: spacing.sm },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    minHeight: minTouchTarget,
  },
  secondaryButtonText: { fontWeight: '600', fontSize: 15 },
  inlineError: { padding: spacing.sm, borderRadius: radius.sm, marginBottom: spacing.sm },
  inlineErrorText: { fontSize: 14, fontWeight: '500' },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  statusCard: { padding: spacing.lg },
  statusTitle: { ...typography.sectionTitle, marginBottom: spacing.sm, textAlign: 'center' },
  statusBody: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.lg },
});
