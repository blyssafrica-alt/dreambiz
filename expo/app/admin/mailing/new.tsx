import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Users, Mail, ChevronRight, FileText, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function-helper';

function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.5;padding:16px;margin:0;color:#1f2937;}</style></head><body>${body}</body></html>`;
}

export default function AdminMailingNewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { duplicate, edit, segmentId } = useLocalSearchParams<{ duplicate?: string; edit?: string; segmentId?: string }>();
  const loadId = duplicate || edit;
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [fromName, setFromName] = useState('DreamBiz');
  const [segmentRole, setSegmentRole] = useState<'supplier' | 'owner' | 'mixed'>('supplier');
  const [profileStatus, setProfileStatus] = useState('all');
  const [joinedWithinDays, setJoinedWithinDays] = useState('90'); // empty = all time
  const [noProductsOnly, setNoProductsOnly] = useState(false);
  const [trialEndsInDays, setTrialEndsInDays] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [audienceMode, setAudienceMode] = useState<'segment' | 'manual_list'>('segment');
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState(
    '<h1>Hi {{first_name}}</h1><p>Welcome to DreamBiz.</p><p>Variables: {{business_name}}, {{supplier_store}}, {{plan_name}}, {{days_left}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>'
  );
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [savingSegment, setSavingSegment] = useState(false);
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [segmentNameInput, setSegmentNameInput] = useState('');
  const [contentMode, setContentMode] = useState<'html' | 'preview'>('html');

  useEffect(() => {
    supabase.from('email_templates').select('id, name').then(({ data }) => setTemplates((data as { id: string; name: string }[]) || []));
  }, []);

  useEffect(() => {
    if (!loadId) return;
    supabase.from('email_campaigns').select('*').eq('id', loadId).single().then(({ data }) => {
      if (!data) return;
      if (edit) setCampaignId(loadId);
      setName((data as any).name || '');
      setSubject((data as any).subject || '');
      setPreviewText((data as any).preview_text || '');
      setFromName((data as any).from_name || 'DreamBiz');
      setHtmlContent((data as any).html_content || '');
      setAudienceCount((data as any).audience_count_estimate ?? null);
      setSelectedTemplateId((data as any).template_id || null);
      const cfg = (data as any).segment_config || {};
      setAudienceMode((data as any).audience_mode === 'manual_list' ? 'manual_list' : 'segment');
      if (cfg.mode === 'manual_list' && Array.isArray(cfg.emails)) {
        setManualEmails(cfg.emails.join('\n'));
      } else {
        setSegmentRole((cfg.role as any) || 'supplier');
        setProfileStatus(cfg.profile_status || 'all');
        setJoinedWithinDays(String(cfg.joined_within_days ?? 90));
        setNoProductsOnly(!!cfg.no_products_only);
        setTrialEndsInDays(cfg.trial_ends_in_days ? String(cfg.trial_ends_in_days) : '');
      }
    });
  }, [loadId, edit]);

  useEffect(() => {
    if (!segmentId) return;
    supabase.from('saved_segments').select('segment_config').eq('id', segmentId).single().then(({ data }) => {
      if (!data) return;
      const cfg = (data as any)?.segment_config;
      if (!cfg) return;
      setAudienceMode(cfg.mode === 'manual_list' ? 'manual_list' : 'segment');
      if (cfg.mode === 'manual_list' && Array.isArray(cfg.emails)) {
        setManualEmails(cfg.emails.join('\n'));
      } else {
        setSegmentRole((cfg.role as any) || 'supplier');
        setProfileStatus(cfg.profile_status || 'all');
        setJoinedWithinDays(cfg.joined_within_days != null ? String(cfg.joined_within_days) : '90');
        setNoProductsOnly(!!cfg.no_products_only);
        setTrialEndsInDays(cfg.trial_ends_in_days ? String(cfg.trial_ends_in_days) : '');
      }
    });
  }, [segmentId]);

  const segmentConfig = audienceMode === 'manual_list'
    ? {
        mode: 'manual_list' as const,
        emails: manualEmails
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e && /^[^@]+@[^@]+\.[^@]+$/.test(e)),
      }
    : {
        role: segmentRole,
        profile_status: segmentRole === 'supplier' && profileStatus !== 'all' ? profileStatus : undefined,
        joined_within_days: joinedWithinDays.trim() ? parseInt(joinedWithinDays, 10) || undefined : undefined,
        no_products_only: noProductsOnly || undefined,
        trial_ends_in_days: trialEndsInDays ? parseInt(trialEndsInDays, 10) : undefined,
      };

  const openSaveSegmentModal = () => {
    if (audienceMode === 'manual_list') {
      RNAlert.alert('Info', 'Save segment is for segment-based audiences. Use paste emails for one-off lists.');
      return;
    }
    setSegmentNameInput(`${segmentRole} · ${profileStatus === 'all' ? 'all' : profileStatus}`);
    setShowSaveSegmentModal(true);
  };

  const saveSegment = async () => {
    const segmentName = segmentNameInput.trim() || `${segmentRole} · ${profileStatus}`;
    if (!segmentName) return;
    setSavingSegment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('saved_segments').insert({
        name: segmentName,
        description: `${segmentRole}${segmentRole === 'supplier' && profileStatus !== 'all' ? ` ${profileStatus}` : ''}, joined ${joinedWithinDays}d`,
        segment_config: segmentConfig,
        created_by: user?.id,
      });
      setShowSaveSegmentModal(false);
      setSegmentNameInput('');
      RNAlert.alert('Saved', 'Segment saved. Use it from Segments.');
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to save segment');
    } finally {
      setSavingSegment(false);
    }
  };

  const estimateAudience = async () => {
    setEstimating(true);
    try {
      const { data, error } = await supabase.rpc('estimate_segment_audience', { p_config: segmentConfig });
      if (error) throw error;
      const res = data as { ok?: boolean; count?: number; error?: string };
      if (res?.ok && typeof res.count === 'number') {
        setAudienceCount(res.count);
        RNAlert.alert('Estimate', `${res.count} recipients`);
      } else {
        RNAlert.alert('Error', res?.error || 'Estimate failed');
      }
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Estimate failed');
    } finally {
      setEstimating(false);
    }
  };

  const saveDraft = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      RNAlert.alert('Required', 'Campaign name is required.');
      return;
    }
    if (!subject.trim()) {
      RNAlert.alert('Required', 'Subject is required.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const row = {
        name: trimmedName,
        subject: subject.trim(),
        preview_text: previewText.trim() || null,
        from_name: fromName.trim() || null,
        status: 'draft',
        audience_mode: audienceMode,
        segment_config: segmentConfig,
        audience_count_estimate: audienceCount,
        html_content: htmlContent.trim() || null,
        template_id: selectedTemplateId || null,
        created_by: user?.id,
      };
      if (campaignId) {
        await supabase.from('email_campaigns').update(row).eq('id', campaignId);
        RNAlert.alert('Saved', 'Campaign updated.');
      } else {
        const { data: inserted, error } = await supabase.from('email_campaigns').insert(row).select('id').single();
        if (error) throw error;
        setCampaignId((inserted as { id: string })?.id);
        RNAlert.alert('Saved', 'Draft created.');
      }
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const ensureSaved = async (): Promise<string | null> => {
    if (campaignId) return campaignId;
    const trimmedName = name.trim();
    if (!trimmedName || !subject.trim()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      name: trimmedName,
      subject: subject.trim(),
      preview_text: previewText.trim() || null,
      from_name: fromName.trim() || null,
      status: 'draft',
      audience_mode: audienceMode,
      segment_config: segmentConfig,
      audience_count_estimate: audienceCount,
      html_content: htmlContent.trim() || null,
      template_id: selectedTemplateId || null,
      created_by: user?.id,
    };
    const { data: inserted, error } = await supabase.from('email_campaigns').insert(row).select('id').single();
    if (error) return null;
    const id = (inserted as { id: string })?.id;
    if (id) setCampaignId(id);
    return id;
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      RNAlert.alert('Required', 'Enter a test email address.');
      return;
    }
    setSendingTest(true);
    try {
      const id = await ensureSaved();
      if (!id) {
        RNAlert.alert('Error', 'Could not save campaign. Check name and subject.');
        return;
      }
      const { data, error } = await invokeEdgeFunction('admin-mailing-send-test', {
        body: { campaign_id: id!, test_email: testEmail.trim() },
      });
      const res = (data || {}) as { success?: boolean; error?: string };
      if (error) {
        let msg = res?.error || (error as any)?.message || 'Failed to send test';
        if ((error as any)?.status === 401 || (error as any)?.statusCode === 401) {
          msg = 'Session expired or invalid. Please sign out and sign in again, then try sending the test email.';
        }
        RNAlert.alert('Error', msg);
        return;
      }
      if (res?.success) {
        RNAlert.alert('Sent', 'Test email sent.');
      } else {
        RNAlert.alert('Error', res?.error || 'Send failed');
      }
    } catch (e) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  };

  const sendCampaign = async () => {
    setSaving(true);
    const id = await ensureSaved();
    setSaving(false);
    if (!id) {
      RNAlert.alert('Error', 'Could not save campaign. Check name and subject.');
      return;
    }
    RNAlert.alert(
      'Send campaign',
      `Send to ~${audienceCount ?? '?'} recipients? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const { data, error } = await invokeEdgeFunction('admin-mailing-send-campaign', {
                body: { campaign_id: id! },
              });
              if (error) {
                const msg = (error as any)?.status === 401
                  ? 'Session expired or invalid. Please sign out and sign in again.'
                  : (error as any)?.message ?? 'Failed to send';
                RNAlert.alert('Error', msg);
                return;
              }
              const res = data as { success?: boolean; sent?: number; failed?: number; error?: string };
              if (res?.success) {
                RNAlert.alert('Sent', `Delivered to ${res.sent ?? 0} recipients.${(res.failed ?? 0) > 0 ? ` ${res.failed} failed.` : ''}`);
                router.replace('/admin/mailing' as any);
              } else {
                RNAlert.alert('Error', res?.error || 'Send failed');
              }
            } catch (e) {
              RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to send');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const audienceSummary = audienceMode === 'manual_list'
    ? `${segmentConfig.emails?.length ?? 0} emails`
    : `${segmentRole}${segmentRole === 'supplier' ? ` · ${profileStatus}` : ''} · ~${audienceCount ?? '?'} recipients`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={edit ? 'Edit campaign' : 'New campaign'}
        subtitle={`Step ${step} of 4`}
        showLogo={false}
        icon={Mail}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.stepBar, { backgroundColor: theme.background.primary }]}>
        <View style={styles.stepLabels}>
          {[
            { n: 1, label: 'Basics', icon: FileText },
            { n: 2, label: 'Audience', icon: Users },
            { n: 3, label: 'Content', icon: Mail },
            { n: 4, label: 'Send', icon: Send },
          ].map(({ n, label, icon: Icon }) => (
            <View key={n} style={styles.stepCol}>
              <View style={[styles.stepDotWrap, n <= step && { backgroundColor: theme.accent.primary }]}>
                {n < step ? <Check size={12} color="#FFF" strokeWidth={3} /> : <Icon size={10} color={n <= step ? '#FFF' : theme.text.tertiary} strokeWidth={2.5} />}
              </View>
              <Text style={[styles.stepLabel, { color: n <= step ? theme.text.primary : theme.text.tertiary }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.stepTrack, { backgroundColor: theme.background.secondary }]}>
          <View style={[styles.stepFill, { width: `${(step / 4) * 100}%`, backgroundColor: theme.accent.primary }]} />
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Basics</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.tertiary }]}>Name, subject, and sender</Text>
            </LinearGradient>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="e.g. Supplier welcome"
              placeholderTextColor={theme.text.tertiary}
              value={name}
              onChangeText={setName}
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Subject *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Email subject line"
              placeholderTextColor={theme.text.tertiary}
              value={subject}
              onChangeText={setSubject}
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Preview text</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Optional"
              placeholderTextColor={theme.text.tertiary}
              value={previewText}
              onChangeText={setPreviewText}
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>From name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="DreamBiz"
              placeholderTextColor={theme.text.tertiary}
              value={fromName}
              onChangeText={setFromName}
            />
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent.primary }]} onPress={() => setStep(2)} activeOpacity={0.85}>
              <Text style={[styles.btnText, { color: '#FFF' }]}>Next: Audience</Text>
              <ChevronRight size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Audience</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.tertiary }]}>Segment or paste emails</Text>
            </LinearGradient>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Source</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, audienceMode === 'segment' && { backgroundColor: theme.accent.primary }]}
                onPress={() => setAudienceMode('segment')}
              >
                <Text style={[styles.chipText, { color: audienceMode === 'segment' ? '#FFF' : theme.text.secondary }]}>Segment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, audienceMode === 'manual_list' && { backgroundColor: theme.accent.primary }]}
                onPress={() => setAudienceMode('manual_list')}
              >
                <Text style={[styles.chipText, { color: audienceMode === 'manual_list' ? '#FFF' : theme.text.secondary }]}>Paste emails</Text>
              </TouchableOpacity>
            </View>
            {audienceMode === 'manual_list' ? (
              <>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Emails (one per line or comma-separated)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="a@example.com, b@example.com"
                  placeholderTextColor={theme.text.tertiary}
                  value={manualEmails}
                  onChangeText={setManualEmails}
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Target</Text>
                <View style={styles.chipRow}>
                  {(['supplier', 'owner', 'mixed'] as const).map((r) => (
                    <TouchableOpacity key={r} style={[styles.chip, segmentRole === r && { backgroundColor: theme.accent.primary }]} onPress={() => setSegmentRole(r)}>
                      <Text style={[styles.chipText, { color: segmentRole === r ? '#FFF' : theme.text.secondary }]}>{r === 'mixed' ? 'Both' : r + 's'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {segmentRole === 'supplier' && (
                  <>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Status</Text>
                    <View style={styles.chipRow}>
                      {['all', 'approved', 'pending'].map((s) => (
                        <TouchableOpacity key={s} style={[styles.chip, profileStatus === s && { backgroundColor: theme.accent.primary }]} onPress={() => setProfileStatus(s)}>
                          <Text style={[styles.chipText, { color: profileStatus === s ? '#FFF' : theme.text.secondary }]}>{s === 'all' ? 'All' : s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.chipRow}>
                      <TouchableOpacity style={[styles.chip, noProductsOnly && { backgroundColor: theme.accent.primary }]} onPress={() => setNoProductsOnly(!noProductsOnly)}>
                        <Text style={[styles.chipText, { color: noProductsOnly ? '#FFF' : theme.text.secondary }]}>Approved, no products</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Trial ending within (days)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      placeholder="e.g. 7"
                      placeholderTextColor={theme.text.tertiary}
                      value={trialEndsInDays}
                      onChangeText={setTrialEndsInDays}
                      keyboardType="number-pad"
                    />
                  </>
                )}
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Joined within (days, blank = all time)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="90 or blank for all"
                  placeholderTextColor={theme.text.tertiary}
                  value={joinedWithinDays}
                  onChangeText={setJoinedWithinDays}
                  keyboardType="number-pad"
                />
              </>
            )}
            <View style={[styles.rowBtns, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1, backgroundColor: theme.background.secondary }]} onPress={estimateAudience} disabled={estimating}>
                {estimating ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <Text style={[styles.btnText, { color: theme.text.primary }]}>Estimate audience</Text>}
              </TouchableOpacity>
              {audienceMode === 'segment' && (
                <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: theme.surface?.info ?? '#0EA5E9' }]} onPress={openSaveSegmentModal} disabled={savingSegment}>
                  {savingSegment ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>Save segment</Text>}
                </TouchableOpacity>
              )}
            </View>
            {audienceCount != null && (
              <>
                <Text style={[styles.estimate, { color: theme.text.secondary }]}>{audienceCount} recipients</Text>
                {audienceCount === 0 && (
                  <Text style={[styles.estimateHint, { color: theme.text.tertiary }]}>Try "All" status or leave "Joined within" blank for all time.</Text>
                )}
              </>
            )}
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.background.secondary }]} onPress={() => setStep(1)}>
                <Text style={[styles.btnText, { color: theme.text.primary }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent.primary }]} onPress={() => setStep(3)} activeOpacity={0.85}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>Next: Content</Text>
                <ChevronRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Content</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.tertiary }]}>Template or custom HTML</Text>
            </LinearGradient>
            {templates.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Template</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !selectedTemplateId && { backgroundColor: theme.accent.primary }]} onPress={() => { setSelectedTemplateId(null); setHtmlContent('<h1>Hi {{first_name}}</h1><p>Variables: {{business_name}}, {{supplier_store}}, {{plan_name}}, {{days_left}}, {{unsubscribe_url}}</p>'); }}>
                    <Text style={[styles.chipText, { color: !selectedTemplateId ? '#FFF' : theme.text.secondary }]}>Custom</Text>
                  </TouchableOpacity>
                  {templates.map((t) => (
                    <TouchableOpacity key={t.id} style={[styles.chip, selectedTemplateId === t.id && { backgroundColor: theme.accent.primary }]} onPress={async () => { setSelectedTemplateId(t.id); const { data } = await supabase.from('email_templates').select('html').eq('id', t.id).single(); if (data?.html) setHtmlContent(data.html); }}>
                      <Text style={[styles.chipText, { color: selectedTemplateId === t.id ? '#FFF' : theme.text.secondary }]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={[styles.chipRow, { marginBottom: 8 }]}>
              <TouchableOpacity style={[styles.chip, contentMode === 'html' && { backgroundColor: theme.accent.primary }]} onPress={() => setContentMode('html')}>
                <Text style={[styles.chipText, { color: contentMode === 'html' ? '#FFF' : theme.text.secondary }]}>HTML</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, contentMode === 'preview' && { backgroundColor: theme.accent.primary }]} onPress={() => setContentMode('preview')}>
                <Text style={[styles.chipText, { color: contentMode === 'preview' ? '#FFF' : theme.text.secondary }]}>Preview</Text>
              </TouchableOpacity>
            </View>
            {contentMode === 'html' ? (
              <>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>HTML body (use {'{{first_name}}'}, {'{{business_name}}'}, {'{{supplier_store}}'}, {'{{plan_name}}'}, {'{{days_left}}'}, {'{{unsubscribe_url}}'})</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder={'<h1>Hi {{first_name}}</h1>...'}
                  placeholderTextColor={theme.text.tertiary}
                  value={htmlContent}
                  onChangeText={setHtmlContent}
                  multiline
                />
              </>
            ) : (
              <View style={[styles.previewWrap, { backgroundColor: theme.background.secondary }]}>
                <WebView
                  source={{ html: wrapEmailHtml(htmlContent || '<p>Enter HTML to preview</p>') }}
                  style={styles.previewWebView}
                  scrollEnabled
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                  originWhitelist={['*']}
                />
              </View>
            )}
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.background.secondary }]} onPress={() => setStep(2)}>
                <Text style={[styles.btnText, { color: theme.text.primary }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent.primary }]} onPress={() => setStep(4)} activeOpacity={0.85}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>Review & Send</Text>
                <ChevronRight size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Review & send</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.tertiary }]}>Preview and send test</Text>
            </LinearGradient>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Email preview</Text>
            <View style={[styles.emailPreviewWrap, { backgroundColor: theme.background.secondary }]}>
              <WebView
                source={{ html: wrapEmailHtml((htmlContent || '').replace(/\{\{first_name\}\}/g, 'Alex').replace(/\{\{business_name\}\}/g, 'Sample Business').replace(/\{\{supplier_store\}\}/g, 'Sample Store').replace(/\{\{plan_name\}\}/g, 'Pro').replace(/\{\{days_left\}\}/g, '7').replace(/\{\{unsubscribe_url\}\}/g, '#unsubscribe')) }}
                style={styles.emailPreviewWebView}
                scrollEnabled
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                originWhitelist={['*']}
              />
            </View>
            <View style={[styles.summary, { backgroundColor: theme.background.secondary }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.tertiary }]}>Name</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{name || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.tertiary }]}>Subject</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{subject || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text.tertiary }]}>Audience</Text>
                <Text style={[styles.summaryValue, { color: theme.text.primary }]}>{audienceSummary}</Text>
              </View>
            </View>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Send test to</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.text.tertiary}
              value={testEmail}
              onChangeText={setTestEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.btn, styles.btnSecondary, { backgroundColor: theme.background.secondary }]} onPress={sendTest} disabled={sendingTest}>
              {sendingTest ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <Text style={[styles.btnText, { color: theme.text.primary }]}>Send test email</Text>}
            </TouchableOpacity>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.background.secondary }]} onPress={saveDraft} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={theme.text.primary} /> : <Text style={[styles.btnText, { color: theme.text.primary }]}>Save draft</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1, backgroundColor: theme.accent.primary }]} onPress={sendCampaign} disabled={sending} activeOpacity={0.85}>
                {sending ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <View style={styles.btnContent}>
                    <Send size={18} color="#FFF" />
                    <Text style={[styles.btnText, { color: '#FFF' }]}>Send now</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showSaveSegmentModal} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalBackdrop, { justifyContent: 'center', alignItems: 'center' }]} activeOpacity={1} onPress={() => setShowSaveSegmentModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Save segment</Text>
            <Text style={[styles.modalSubtitle, { color: theme.text.tertiary }]}>Name this segment for reuse</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="e.g. Approved suppliers, joined 90d"
              placeholderTextColor={theme.text.tertiary}
              value={segmentNameInput}
              onChangeText={setSegmentNameInput}
            />
            <View style={[styles.rowBtns, { marginTop: 16 }]}>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: theme.background.secondary }]} onPress={() => setShowSaveSegmentModal(false)}>
                <Text style={[styles.btnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: theme.accent.primary }]} onPress={saveSegment} disabled={savingSegment}>
                {savingSegment ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  stepBar: { paddingHorizontal: 16, paddingVertical: 16 },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stepCol: { alignItems: 'center', flex: 1 },
  stepDotWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepLabel: { fontSize: 11, fontWeight: '700' },
  stepTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  stepFill: { height: '100%', borderRadius: 2 },
  section: { borderRadius: 20, padding: 20, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  sectionHeader: { padding: 18, borderRadius: 14, marginBottom: 20, marginHorizontal: -2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 14, marginTop: 4, opacity: 0.9 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 12 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  chipText: { fontSize: 14, fontWeight: '700' },
  btn: { marginTop: 16, paddingVertical: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnPrimary: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  btnSecondary: {},
  btnText: { fontWeight: '600', fontSize: 15 },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estimate: { marginTop: 8, fontSize: 14 },
  estimateHint: { marginTop: 4, fontSize: 13, fontStyle: 'italic' },
  previewWrap: { height: 320, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  previewWebView: { flex: 1 },
  emailPreviewWrap: { height: 360, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  emailPreviewWebView: { flex: 1 },
  summary: { padding: 20, borderRadius: 16, marginBottom: 20 },
  summaryRow: { marginBottom: 12 },
  summaryLabel: { fontSize: 12, marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '88%', maxWidth: 360, padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 12 },
});
