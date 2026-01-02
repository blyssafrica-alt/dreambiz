import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  Modal,
  Image,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Book as BookIcon, X, ImageIcon, Save, FileText, Upload, Check, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer';
import type { Book, BookFormData, BookChapter } from '@/types/books';
import type { FeatureConfig } from '@/types/super-admin';
import type { DreamBigBook } from '@/types/business';

// NOTE: buildEdgeFunctionUrl removed - we use supabase.functions.invoke() instead

export default function BooksManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableFeatures, setAvailableFeatures] = useState<FeatureConfig[]>([]);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  // Track retry count and processing state to prevent infinite loops
  const processingRetryCountRef = useRef(0);
  const isProcessingRef = useRef(false);
  const [formData, setFormData] = useState<BookFormData>({
    slug: '',
    title: '',
    subtitle: '',
    description: '',
    coverImage: undefined,
    documentFile: undefined,
    documentFileUrl: undefined,
    price: 0,
    currency: 'USD',
    salePrice: undefined,
    saleStartDate: undefined,
    saleEndDate: undefined,
    totalChapters: 0,
    chapters: [],
    enabledFeatures: [],
    author: '',
    isbn: '',
    publicationDate: undefined,
    pageCount: undefined,
    status: 'draft',
    isFeatured: false,
    displayOrder: 0,
  });

  // Helper to ensure string values are never null/undefined
  const ensureString = (value: string | null | undefined): string => {
    return value ?? '';
  };
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  useEffect(() => {
    loadBooks();
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_config')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        setAvailableFeatures(data.map((row: any) => ({
          id: row.id,
          featureId: row.feature_id,
          name: row.name,
          description: row.description,
          category: row.category,
          visibility: row.visibility || {},
          access: row.access || {},
          enabled: row.enabled,
          enabledByDefault: row.enabled_by_default,
          canBeDisabled: row.can_be_disabled,
          updatedBy: row.updated_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load features:', error);
    }
  };

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setBooks(data.map((row: any) => ({
          id: row.id,
          slug: row.slug || '',
          title: row.title || '',
          subtitle: row.subtitle || '',
          description: row.description || '',
          coverImage: row.cover_image || undefined,
          documentFileUrl: row.document_file_url || undefined,
          price: parseFloat(row.price || '0'),
          currency: row.currency || 'USD',
          salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
          saleStartDate: row.sale_start_date || undefined,
          saleEndDate: row.sale_end_date || undefined,
          totalChapters: row.total_chapters || 0,
          chapters: row.chapters || [],
          enabledFeatures: row.enabled_features || [],
          author: row.author || '',
          isbn: row.isbn || '',
          publicationDate: row.publication_date || undefined,
          pageCount: row.page_count || undefined,
          status: row.status || 'draft',
          isFeatured: row.is_featured || false,
          displayOrder: row.display_order || 0,
          totalSales: row.total_sales || 0,
          totalRevenue: parseFloat(row.total_revenue || '0'),
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load books:', error);
      Alert.alert('Error', 'Failed to load books');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll access to upload book covers');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4], // Book cover aspect ratio
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        try {
          const base64 = asset.base64;
          const fileExt = asset.uri.split('.').pop() || 'jpg';
          const fileName = `book-cover-${Date.now()}.${fileExt}`;
          const filePath = `book_covers/${fileName}`;

          const { data, error } = await supabase.storage
            .from('book_covers')
            .upload(filePath, decode(base64), {
              contentType: asset.mimeType || 'image/jpeg',
              upsert: false,
            });

          if (error) {
            if (error.message.includes('Bucket not found')) {
              Alert.alert('Storage Error', 'Book covers bucket not found. Please create a "book_covers" bucket in Supabase Storage.');
              return;
            }
            throw error;
          }

          const { data: publicUrlData } = supabase.storage
            .from('book_covers')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            setFormData({ ...formData, coverImage: publicUrlData.publicUrl });
          }
        } catch (error: any) {
          console.error('Error uploading cover image:', error);
          Alert.alert('Upload Error', error.message || 'Failed to upload cover image');
        }
      } else {
        // Fallback to local URI if base64 not available
        setFormData({ ...formData, coverImage: asset.uri });
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, documentFile: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocumentToStorage = async (fileUri: string, bookSlug: string): Promise<string | null> => {
    try {
      setIsUploadingDocument(true);
      
      // Read file as base64
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Get file extension
      const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${bookSlug}-${Date.now()}.${fileExtension}`;
      const filePath = `books/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('book-documents')
        .upload(filePath, decode(base64), {
          contentType: fileExtension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });

      if (error) {
        // If bucket doesn't exist, show error
        if (error.message.includes('Bucket not found')) {
          Alert.alert('Storage Error', 'Book documents bucket not found. Please create a "book-documents" bucket in Supabase Storage.');
          return null;
        }
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('book-documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload document');
      return null;
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const processPDFDocument = async () => {
    if (!formData.documentFileUrl) {
      Alert.alert('No Document', 'Please upload a PDF document first');
      return;
    }

    // Prevent multiple simultaneous calls (only for fresh calls, not retries)
    if (isProcessingRef.current && processingRetryCountRef.current === 0) {
      console.log('[process-pdf] Already processing, ignoring duplicate call');
      return;
    }

    // ============================================
    // RETRY GUARD - Prevent retry storms
    // ============================================
    const MAX_RETRIES = 3;
    const MAX_POLL_ATTEMPTS = 60; // 60 * 2s = 2 minutes max
    const POLL_INTERVAL = 2000; // 2 seconds
    const TIMEOUT_MS = 120000; // 2 minutes total timeout

    // Reset retry count if this is a fresh call (not a retry)
    if (processingRetryCountRef.current === 0) {
      isProcessingRef.current = true;
    }

    let pollAttempts = 0;
    const startTime = Date.now();

    try {
      setIsProcessingPDF(true);
      
      // bookId is now optional - we can process PDF even for new books
      // The Edge Function will extract data and return it without updating database

      // ============================================
      // COMPLETE AUTH FLOW FOR EDGE FUNCTION CALL
      // ============================================
      // The Supabase gateway validates JWT tokens BEFORE forwarding to Edge Functions.
      // If JWT is invalid/expired, gateway returns 401 and function never executes.
      // Solution: Use getUser() to validate token with Supabase, not just getSession().
      // ============================================
      
      // ============================================
      // COMPREHENSIVE AUTH FLOW - GET FRESH TOKEN
      // ============================================
      // The Supabase gateway validates JWT tokens BEFORE forwarding to Edge Functions.
      // If JWT is invalid/expired, gateway returns 401 and function NEVER executes.
      // Solution: Get fresh, validated token RIGHT BEFORE making the request.
      // ============================================
      
      try {
        // STEP 1: Get current session
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('[process-pdf] No session available:', sessionError);
          Alert.alert('Authentication Error', 'Please sign in to process PDF documents.');
          setIsProcessingPDF(false);
          return;
        }
        
        // STEP 2: Check expiration and refresh proactively
        const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
        const now = new Date();
        const expiresIn = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
        
        // Refresh if expired or expiring in less than 15 minutes (be proactive)
        if (!expiresAt || expiresAt <= now || expiresIn < 15 * 60 * 1000) {
          if (__DEV__) {
            console.log('[process-pdf] Session expiring soon, refreshing proactively...', {
              expiresAt: expiresAt?.toISOString(),
              expiresInSeconds: Math.round(expiresIn / 1000),
            });
          }
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData?.session?.access_token) {
            console.error('[process-pdf] Session refresh failed:', refreshError);
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please sign in again to process PDF documents.'
            );
            setIsProcessingPDF(false);
            return;
          }
          
          // Use refreshed session
          session = refreshData.session;
          if (__DEV__) {
            console.log('[process-pdf] ✅ Session refreshed successfully');
          }
        }
        
        // STEP 3: Validate token with server using getUser() - CRITICAL STEP
        // This validates the token AND ensures it matches the current session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('[process-pdf] Token validation failed:', userError);
          
          // Try one more refresh if validation failed
          const { data: retryRefresh, error: retryError } = await supabase.auth.refreshSession();
          if (retryError || !retryRefresh?.session?.access_token) {
            Alert.alert(
              'Authentication Error',
              'Your session is invalid. Please sign in again.'
            );
            setIsProcessingPDF(false);
            return;
          }
          
          // Retry validation with refreshed token
          const { data: { user: retryUser }, error: retryUserError } = await supabase.auth.getUser();
          if (retryUserError || !retryUser) {
            Alert.alert(
              'Authentication Error',
              'Your session is invalid. Please sign in again.'
            );
            setIsProcessingPDF(false);
            return;
          }
          
          // Use retry session
          session = retryRefresh.session;
          if (__DEV__) {
            console.log('[process-pdf] ✅ Token validated after retry');
          }
        }
        
        // STEP 4: Verify token is valid and not expired RIGHT NOW
        // Decode JWT to check expiration
        let tokenExpired = false;
        if (session?.access_token) {
          try {
            const tokenParts = session.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const tokenExp = payload.exp ? new Date(payload.exp * 1000) : null;
              const now = new Date();
              
              if (tokenExp && tokenExp <= now) {
                tokenExpired = true;
                if (__DEV__) {
                  console.error('[process-pdf] Token is EXPIRED:', {
                    tokenExp: tokenExp.toISOString(),
                    now: now.toISOString(),
                    expiredBy: Math.round((now.getTime() - tokenExp.getTime()) / 1000) + ' seconds',
                  });
                }
                
                // Force refresh if expired
                const { data: forceRefresh, error: forceRefreshError } = await supabase.auth.refreshSession();
                if (forceRefreshError || !forceRefresh?.session?.access_token) {
                  Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please sign in again.'
                  );
                  setIsProcessingPDF(false);
                  return;
                }
                session = forceRefresh.session;
                
                if (__DEV__) {
                  console.log('[process-pdf] ✅ Token refreshed after expiration check');
                }
              } else if (__DEV__) {
                console.log('[process-pdf] Token expiration check:', {
                  tokenExp: tokenExp?.toISOString(),
                  now: now.toISOString(),
                  expiresIn: tokenExp ? Math.round((tokenExp.getTime() - now.getTime()) / 1000) + ' seconds' : 'unknown',
                  isExpired: false,
                });
              }
            }
          } catch (decodeError) {
            if (__DEV__) {
              console.warn('[process-pdf] Could not decode token for expiration check:', decodeError);
            }
          }
        }
        
        // STEP 5: Verify Supabase client configuration
        const supabaseConfig = await import('@/lib/supabase');
        const clientUrl = supabaseConfig.supabaseUrl || 'https://oqcgerfjjiozltkmmkxf.supabase.co';
        const clientAnonKey = supabaseConfig.supabaseAnonKey || 'sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp';
        
        if (__DEV__) {
          console.log('[process-pdf] Using supabase.functions.invoke() - automatic auth handling');
          console.log('[process-pdf] Client configuration:', {
            clientUrl,
            clientAnonKeyLength: clientAnonKey?.length || 0,
            hasSession: !!session,
            hasAccessToken: !!session?.access_token,
            tokenLength: session?.access_token?.length || 0,
            userId: user?.id,
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            tokenWasExpired: tokenExpired,
          });
        }
        
        // STEP 6: FINAL check - Get session one last time and validate token is still valid
        // This ensures we use the absolute freshest token right before the call
        const { data: { session: finalCheckSession }, error: finalCheckError } = await supabase.auth.getSession();
        
        if (finalCheckError || !finalCheckSession?.access_token) {
          console.error('[process-pdf] Final session check failed:', finalCheckError);
          Alert.alert(
            'Authentication Error',
            'Unable to get valid session. Please sign in again.'
          );
          setIsProcessingPDF(false);
          return;
        }
        
        // Validate final token with getUser() one more time
        const { data: { user: finalUser }, error: finalUserError } = await supabase.auth.getUser();
        
        if (finalUserError || !finalUser) {
          console.error('[process-pdf] Final token validation failed:', finalUserError);
          Alert.alert(
            'Authentication Error',
            'Your session is invalid. Please sign out and sign back in.'
          );
          setIsProcessingPDF(false);
          return;
        }
        
        if (__DEV__) {
          console.log('[process-pdf] ✅ Final token validation passed, calling function');
        }
        
        // ============================================
        // STEP 7: CALL EDGE FUNCTION USING supabase.functions.invoke() ONLY
        // ============================================
        // This is the ONLY way to call Edge Functions - automatic auth handling
        // DO NOT use manual fetch() - it bypasses automatic auth injection
        // ============================================
        
        let jobResponse: any;
        let jobError: any = null;
        
        try {
          console.log('[process-pdf] 📤 Calling Edge Function via supabase.functions.invoke()');
          console.log('[process-pdf] 📤 Function: process-pdf');
          console.log('[process-pdf] 📤 Has valid session:', !!session?.access_token);
          
          // Use supabase.functions.invoke() - handles auth automatically
          const { data, error } = await supabase.functions.invoke('process-pdf', {
            body: {
              pdfUrl: formData.documentFileUrl,
              bookId: editingId || null,
            },
          });
          
          if (error) {
            console.error('[process-pdf] ❌ Function invoke error:', error);
            jobError = {
              status: error.status || 500,
              statusCode: error.status || 500,
              message: error.message || 'Unknown error',
              error: error,
            };
            
            // Check for 401 specifically
            if (error.status === 401 || error.statusCode === 401) {
              jobError.message = 'Authentication failed. Please sign out and sign back in.';
              jobError.requiresReauth = true;
            }
          } else {
            jobResponse = data;
            console.log('[process-pdf] ✅ Function invoke success:', jobResponse);
          }
        } catch (invokeError: any) {
          console.error('[process-pdf] ❌ Function invoke exception:', invokeError);
          jobError = {
            status: invokeError.status || 500,
            statusCode: invokeError.statusCode || 500,
            message: invokeError.message || 'Function call failed',
            originalError: invokeError,
          };
        }

        if (jobError) {
          // Handle 401 FIRST - don't retry at all
          if (jobError.status === 401 || jobError.statusCode === 401) {
            // Reset retry counter and processing flag
            processingRetryCountRef.current = 0;
            isProcessingRef.current = false;
            setIsProcessingPDF(false);
            
            // Provide specific error message based on response
            let errorMessage = 'Unable to process PDF. The function returned 401 Unauthorized.\n\n';
            
            if (jobError.responseText?.includes('not found') || jobError.message?.includes('404')) {
              errorMessage += '⚠️ FUNCTION NOT DEPLOYED\n\n';
              errorMessage += 'The Edge Function is not deployed. Please:\n';
              errorMessage += '1. Go to Supabase Dashboard → Edge Functions\n';
              errorMessage += '2. Deploy the "process-pdf" function\n';
              errorMessage += '3. See QUICK_FIX_401_ERRORS.md for instructions\n';
            } else {
              errorMessage += 'Possible causes:\n';
              errorMessage += '1. Edge Function is not deployed (most likely)\n';
              errorMessage += '2. User session expired\n';
              errorMessage += '3. Gateway authentication issue\n\n';
              errorMessage += 'Solutions:\n';
              errorMessage += '1. Deploy the function (see QUICK_FIX_401_ERRORS.md)\n';
              errorMessage += '2. Sign out and sign back in\n';
              errorMessage += '3. Check Supabase Dashboard → Edge Functions → Logs\n';
            }
            
            errorMessage += '\nYou can use manual entry as a fallback.';
            
            Alert.alert('Authentication Failed', errorMessage, [{ text: 'OK' }]);
            return;
          }

          // Check retry limit (for non-401 errors)
          if (processingRetryCountRef.current >= MAX_RETRIES) {
            console.error('[process-pdf] Max retries exceeded');
            processingRetryCountRef.current = 0;
            isProcessingRef.current = false;
            setIsProcessingPDF(false);
            
            Alert.alert(
              'PDF Processing Failed',
              `Unable to start PDF processing after ${MAX_RETRIES} attempts.\n\nPlease try:\n1. Sign out and sign back in\n2. Use manual entry\n\nError: ${jobError.message || 'Unknown error'}`
            );
            return;
          }

          // Retry with exponential backoff (only for non-401 errors)
          processingRetryCountRef.current++;
          const delay = Math.min(1000 * Math.pow(2, processingRetryCountRef.current - 1), 5000);
          console.log(`[process-pdf] Retrying in ${delay}ms (attempt ${processingRetryCountRef.current}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Retry the entire function (will restart from beginning)
          return processPDFDocument();
        }

        if (!jobResponse?.success || !jobResponse?.jobId) {
          // Reset retry counter and processing flag
          processingRetryCountRef.current = 0;
          isProcessingRef.current = false;
          setIsProcessingPDF(false);
          
          // Check if this is a deployment issue
          if (jobResponse?.deploymentIssue) {
            Alert.alert(
              'Deployment Required',
              `${jobResponse.error || 'Database or function not configured'}\n\n${jobResponse.fixInstructions || 'Please complete the deployment steps.'}\n\nSee docs/401_ERROR_DIAGNOSTIC_FIX.md for detailed instructions.`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'PDF Processing Failed',
              jobResponse?.error || 'Failed to start PDF processing job. Please try manual entry.'
            );
          }
          return;
        }

        // Reset retry counter on success
        processingRetryCountRef.current = 0;

        const jobId = jobResponse.jobId;
        console.log(`[process-pdf] Job created: ${jobId}, polling for status...`);

        // ============================================
        // POLL JOB STATUS (with timeout and retry limits)
        // ============================================
        while (pollAttempts < MAX_POLL_ATTEMPTS) {
          // Check timeout
          if (Date.now() - startTime > TIMEOUT_MS) {
            Alert.alert(
              'Processing Timeout',
              'PDF processing is taking longer than expected. You can check back later or use manual entry.'
            );
            setIsProcessingPDF(false);
            return;
          }

          // Wait before polling
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          pollAttempts++;

          try {
            // Check job status using supabase.functions.invoke() ONLY
            console.log(`[process-pdf] Polling job status: ${jobId}`);
            
            const { data: statusData, error: statusError } = await supabase.functions.invoke('process-pdf', {
              body: {
                jobId: jobId,
              },
            });
            
            let statusResponse: any = null;
            
            if (statusError) {
              console.warn(`[process-pdf] Status check error (attempt ${pollAttempts}):`, statusError);
              continue; // Continue polling (might be temporary)
            } else {
              statusResponse = statusData;
            }

            const job = statusResponse?.job;
            if (!job) {
              continue; // Continue polling
            }

            // Log progress
            if (__DEV__ && job.progress) {
              console.log(`[process-pdf] Job ${jobId} progress: ${job.progress}% (status: ${job.status})`);
            }

            // Check job status
            if (job.status === 'completed') {
              const result = job.result;
              if (result) {
                // Update form with extracted information
                const updatedFormData: any = { ...formData };

                if (result.pageCount && result.pageCount > 0) {
                  updatedFormData.pageCount = result.pageCount;
                }

                if (result.chapters && result.chapters.length > 0) {
                  updatedFormData.chapters = result.chapters;
                  updatedFormData.totalChapters = result.chapters.length;
                  setFormData(updatedFormData);
                  setIsProcessingPDF(false);
                  Alert.alert(
                    'Success',
                    `PDF processed successfully!\n\n• Pages: ${result.pageCount || 'N/A'}\n• Chapters: ${result.chapters.length}`
                  );
                  return;
                } else if (result.pageCount && result.pageCount > 0) {
                  updatedFormData.pageCount = result.pageCount;
                  setFormData(updatedFormData);
                  setIsProcessingPDF(false);
                  Alert.alert(
                    'PDF Processed',
                    `PDF processed successfully!\n\n• Pages: ${result.pageCount}\n• Chapters: Please enter manually in Step 4.`
                  );
                  return;
                }
              }

              // Job completed but no useful data
              setIsProcessingPDF(false);
              Alert.alert(
                'PDF Processing Complete',
                'PDF processed but no chapters were detected. Please enter chapters manually in Step 4.'
              );
              return;
            }

            if (job.status === 'failed') {
              setIsProcessingPDF(false);
              Alert.alert(
                'PDF Processing Failed',
                `Processing failed: ${job.error || 'Unknown error'}\n\nPlease use manual entry.`
              );
              return;
            }

            // Status is 'pending' or 'processing' - continue polling
          } catch (pollError: any) {
            console.warn(`[process-pdf] Poll error (attempt ${pollAttempts}):`, pollError);
            // Continue polling
          }
        }

        // Max poll attempts reached
        setIsProcessingPDF(false);
        Alert.alert(
          'Processing Timeout',
          'PDF processing is taking longer than expected. You can check back later or use manual entry.'
        );
      } catch (edgeFunctionError: any) {
        console.error('[process-pdf] Exception:', edgeFunctionError);
        // Reset retry counter and processing flag
        processingRetryCountRef.current = 0;
        isProcessingRef.current = false;
        setIsProcessingPDF(false);
        
        Alert.alert(
          'PDF Processing Unavailable',
          `The PDF processing service is not available.\n\nError: ${edgeFunctionError?.message || 'Network error'}\n\nPlease use manual entry.`
        );
      } finally {
        // Ensure flags are reset even if there's an unexpected error
        if (isProcessingRef.current) {
          isProcessingRef.current = false;
        }
      }

      // Fallback to manual entry (shouldn't reach here normally)
      Alert.alert(
        'PDF Processing',
        'Automatic PDF processing is not available. You can enter chapter information manually.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Chapters Manually',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Alert.prompt(
                  'Enter Number of Chapters',
                  'How many chapters does this book have?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'OK',
                      onPress: (chapterCountStr) => {
                        const chapterCount = parseInt(chapterCountStr || '0', 10);
                        if (chapterCount > 0) {
                          // Create placeholder chapters
                          const chapters: BookChapter[] = [];
                          for (let i = 1; i <= chapterCount; i++) {
                            chapters.push({ number: i, title: `Chapter ${i}` });
                          }
                          setFormData({ ...formData, chapters, totalChapters: chapterCount });
                          Alert.alert('Chapters Added', `Added ${chapterCount} placeholder chapters. You can edit them after saving.`);
                        }
                      }
                    }
                  ],
                  'plain-text'
                );
              } else {
                // For Android, show a simpler approach
                Alert.alert(
                  'Manual Chapter Entry',
                  'Please enter the total number of chapters in the "Total Chapters" field above, then save. You can edit individual chapter titles after saving.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Failed to process PDF:', error);
      Alert.alert('Processing Error', error.message || 'Failed to process PDF document');
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      Alert.alert('Missing Fields', 'Please fill in slug and title');
      return;
    }

    try {
      // Upload document if a new file was selected
      let documentFileUrl = formData.documentFileUrl;
      if (formData.documentFile && !formData.documentFileUrl) {
        const uploadedUrl = await uploadDocumentToStorage(formData.documentFile, formData.slug);
        if (uploadedUrl) {
          documentFileUrl = uploadedUrl;
        } else {
          Alert.alert('Upload Failed', 'Document upload failed. Book will be saved without document.');
        }
      }

      const bookData: any = {
        slug: formData.slug,
        title: formData.title,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        cover_image: formData.coverImage || null,
        document_file_url: documentFileUrl || null,
        price: formData.price,
        currency: formData.currency,
        sale_price: formData.salePrice || null,
        sale_start_date: formData.saleStartDate || null,
        sale_end_date: formData.saleEndDate || null,
        total_chapters: formData.totalChapters,
        chapters: JSON.stringify(formData.chapters),
        enabled_features: formData.enabledFeatures || [],
        author: formData.author || null,
        isbn: formData.isbn || null,
        publication_date: formData.publicationDate || null,
        page_count: formData.pageCount || null,
        status: formData.status,
        is_featured: formData.isFeatured,
        display_order: formData.displayOrder,
      };

      // Also update feature_config to link features to this book
      if (formData.enabledFeatures && formData.enabledFeatures.length > 0) {
        // Update each feature's access.requiresBook to include this book's slug
        for (const featureId of formData.enabledFeatures) {
          const feature = availableFeatures.find(f => f.featureId === featureId);
          if (feature) {
            const currentRequiresBook = feature.access.requiresBook || [];
            // Cast slug to DreamBigBook since it should be one of the valid book slugs
            const bookSlug = formData.slug as DreamBigBook;
            if (!currentRequiresBook.includes(bookSlug)) {
              const updatedRequiresBook = [...currentRequiresBook, bookSlug];
              await supabase
                .from('feature_config')
                .update({
                  access: {
                    ...feature.access,
                    requiresBook: updatedRequiresBook,
                  },
                })
                .eq('feature_id', featureId);
            }
          }
        }
      }

      if (editingId) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Book updated successfully');
      } else {
        const { error } = await supabase
          .from('books')
          .insert(bookData);

        if (error) throw error;
        Alert.alert('Success', 'Book created successfully');
      }

      handleCloseModal();
      loadBooks();
    } catch (error: any) {
      console.error('Failed to save book:', error);
      Alert.alert('Error', error.message || 'Failed to save book');
    }
  };

  const handleEdit = (book: Book) => {
    setEditingId(book.id);
    setStep(1);
    setFormData({
      slug: book.slug || '',
      title: book.title || '',
      subtitle: book.subtitle || '',
      description: book.description || '',
      coverImage: book.coverImage || undefined,
      documentFile: undefined,
      documentFileUrl: book.documentFileUrl || undefined,
      price: book.price || 0,
      currency: book.currency || 'USD',
      salePrice: book.salePrice || undefined,
      saleStartDate: book.saleStartDate || undefined,
      saleEndDate: book.saleEndDate || undefined,
      totalChapters: book.totalChapters || 0,
      chapters: Array.isArray(book.chapters) ? book.chapters : [],
      enabledFeatures: book.enabledFeatures || [],
      author: book.author || '',
      isbn: book.isbn || '',
      publicationDate: book.publicationDate || undefined,
      pageCount: book.pageCount || undefined,
      status: book.status || 'draft',
      isFeatured: book.isFeatured || false,
      displayOrder: book.displayOrder || 0,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Book',
      'Are you sure you want to delete this book?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', id);

              if (error) throw error;
              loadBooks();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete book');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setStep(1);
    setFormData({
      slug: '',
      title: '',
      subtitle: '',
      description: '',
      coverImage: undefined,
      documentFile: undefined,
      documentFileUrl: undefined,
      price: 0,
      currency: 'USD',
      salePrice: undefined,
      saleStartDate: undefined,
      saleEndDate: undefined,
      totalChapters: 0,
      chapters: [],
      enabledFeatures: [],
      author: '',
      isbn: '',
      publicationDate: undefined,
      pageCount: undefined,
      status: 'draft',
      isFeatured: false,
      displayOrder: 0,
    });
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const progress = (step / totalSteps) * 100;

  const toggleFeature = (featureId: string) => {
    const currentFeatures = formData.enabledFeatures || [];
    if (currentFeatures.includes(featureId)) {
      setFormData({
        ...formData,
        enabledFeatures: currentFeatures.filter(id => id !== featureId),
      });
    } else {
      setFormData({
        ...formData,
        enabledFeatures: [...currentFeatures, featureId],
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#10B981';
      case 'draft': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return '#6B7280';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Manage Books</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!books || books.length === 0 ? (
          <View style={styles.emptyState}>
            <BookIcon size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No books yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              Add your first DreamBig book
            </Text>
          </View>
        ) : (
          <>
            {(books || []).map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookCard, { backgroundColor: theme.background.card }]}
                onPress={() => handleEdit(book)}
              >
              {book.coverImage && (
                <Image source={{ uri: book.coverImage }} style={styles.bookCover} />
              )}
              <View style={styles.bookInfo}>
                <View style={styles.bookHeader}>
                  <Text style={[styles.bookTitle, { color: theme.text.primary }]}>
                    {book.title || 'Untitled Book'}
                  </Text>
                  {book.isFeatured && (
                    <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                      <Text style={[styles.featuredText, { color: theme.accent.primary }]}>
                        Featured
                      </Text>
                    </View>
                  )}
                </View>
                {book.subtitle ? (
                  <Text style={[styles.bookSubtitle, { color: theme.text.secondary }]}>
                    {book.subtitle}
                  </Text>
                ) : null}
                <View style={styles.bookMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(book.status || 'draft') + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(book.status || 'draft') }]}>
                      {(book.status || 'draft').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.bookMetaText, { color: theme.text.tertiary }]}>
                    {book.totalChapters || 0} chapters
                  </Text>
                  <Text style={[styles.bookMetaText, { color: theme.text.tertiary }]}>
                    ${(book.price || 0).toFixed(2)}
                  </Text>
                </View>
                {book.documentFileUrl ? (
                  <View style={[styles.documentBadge, { backgroundColor: theme.surface.info }]}>
                    <FileText size={12} color={theme.accent.info} />
                    <Text style={[styles.documentBadgeText, { color: theme.accent.info }]}>
                      Document Available
                    </Text>
                  </View>
                ) : null}
                {book.description ? (
                  <Text 
                    style={[styles.bookDescription, { color: theme.text.secondary }]}
                    numberOfLines={2}
                  >
                    {book.description}
                  </Text>
                ) : null}
                <View style={styles.bookStats}>
                  <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                    Sales: {book.totalSales || 0}
                  </Text>
                  <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                    Revenue: ${(book.totalRevenue || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.bookActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                  onPress={() => handleEdit(book)}
                >
                  <Edit size={18} color={theme.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                  onPress={() => handleDelete(book.id)}
                >
                  <Trash2 size={18} color={theme.accent.danger} />
                </TouchableOpacity>
              </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal - Step by Step Wizard */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  {step === 1 ? 'Basic Information' : 
                   step === 2 ? 'Media & Documents' :
                   step === 3 ? 'Pricing & Metadata' :
                   step === 4 ? 'Chapters & Features' :
                   step === 5 ? 'Settings' : 'Book Management'}
                </Text>
                <Text style={[styles.stepIndicator, { color: theme.text.secondary }]}>
                  Step {step} of {totalSteps}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.accent.primary }]} />
            </View>

            <ScrollView 
              style={styles.modalBody} 
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                      Book Basic Information
                    </Text>
                    <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
                      Enter the essential details about your book
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Slug *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.slug)}
                      onChangeText={(text) => setFormData({ ...formData, slug: text.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="e.g., start-your-business"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Title *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.title)}
                      onChangeText={(text) => setFormData({ ...formData, title: text })}
                      placeholder="Book title"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Subtitle</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.subtitle)}
                      onChangeText={(text) => setFormData({ ...formData, subtitle: text })}
                      placeholder="Book subtitle"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.description)}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder="Book description"
                      placeholderTextColor={theme.text.tertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </>
              )}

              {/* Step 2: Media & Documents */}
              {step === 2 && (
                <>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                      Book Media & Documents
                    </Text>
                    <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
                      Upload cover image and book document (PDF/Word)
                    </Text>
                  </View>

              {/* Cover Image */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Cover Image</Text>
                {formData.coverImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: formData.coverImage }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={[styles.removeImageButton, { backgroundColor: theme.accent.danger }]}
                      onPress={() => setFormData({ ...formData, coverImage: undefined })}
                    >
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.imageUploadButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}
                    onPress={handlePickCoverImage}
                  >
                    <ImageIcon size={24} color={theme.accent.primary} />
                    <Text style={[styles.imageUploadText, { color: theme.text.secondary }]}>
                      Add Cover Image
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Document File (PDF/Word) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Book Document (PDF/Word)</Text>
                {formData.documentFileUrl ? (
                  <View style={styles.documentPreviewContainer}>
                    <View style={[styles.documentPreview, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
                      <FileText size={24} color={theme.accent.primary} />
                      <Text style={[styles.documentPreviewText, { color: theme.text.primary }]} numberOfLines={1}>
                        {formData.documentFileUrl.split('/').pop() || 'Document uploaded'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setFormData({ ...formData, documentFileUrl: undefined, documentFile: undefined })}
                      >
                        <X size={18} color={theme.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : formData.documentFile ? (
                  <View style={styles.documentPreviewContainer}>
                    <View style={[styles.documentPreview, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
                      <FileText size={24} color={theme.accent.primary} />
                      <Text style={[styles.documentPreviewText, { color: theme.text.primary }]} numberOfLines={1}>
                        {formData.documentFile.split('/').pop() || 'Document selected'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setFormData({ ...formData, documentFile: undefined })}
                      >
                        <X size={18} color={theme.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.imageUploadButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}
                    onPress={handlePickDocument}
                    disabled={isUploadingDocument}
                  >
                    <Upload size={24} color={theme.accent.primary} />
                    <Text style={[styles.imageUploadText, { color: theme.text.secondary }]}>
                      {isUploadingDocument ? 'Uploading...' : 'Upload PDF/Word Document'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                  Upload the complete book as PDF or Word document. This will be used to extract book information.
                </Text>
                {formData.documentFileUrl && (
                  <TouchableOpacity
                    style={[styles.processButton, { backgroundColor: theme.accent.primary }]}
                    onPress={processPDFDocument}
                    disabled={isProcessingPDF}
                  >
                    {isProcessingPDF ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Sparkles size={18} color="#FFF" />
                        <Text style={[styles.processButtonText, { color: '#FFF' }]}>
                          Process PDF & Extract Chapters
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
                </>
              )}

              {/* Step 3: Pricing & Metadata */}
              {step === 3 && (
                <>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                      Pricing & Book Metadata
                    </Text>
                    <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
                      Set pricing and additional book information
                    </Text>
                  </View>

                  {/* Pricing */}
                  <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Price *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={formData.price.toString()}
                    onChangeText={(text) => setFormData({ ...formData, price: parseFloat(text) || 0 })}
                    placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                />
              </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Currency</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={ensureString(formData.currency)}
                    onChangeText={(text) => setFormData({ ...formData, currency: text })}
                    placeholder="USD"
                  placeholderTextColor={theme.text.tertiary}
                />
                </View>
              </View>

              <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Author</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.author)}
                      onChangeText={(text) => setFormData({ ...formData, author: text })}
                      placeholder="Author name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>ISBN</Text>
                <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={ensureString(formData.isbn)}
                      onChangeText={(text) => setFormData({ ...formData, isbn: text })}
                      placeholder="ISBN number"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.label, { color: theme.text.primary }]}>Publication Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        value={formData.publicationDate ?? ''}
                        onChangeText={(text) => setFormData({ ...formData, publicationDate: text || undefined })}
                        placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={[styles.label, { color: theme.text.primary }]}>Page Count</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        value={formData.pageCount?.toString() || ''}
                        onChangeText={(text) => setFormData({ ...formData, pageCount: text ? parseInt(text) : undefined })}
                        placeholder="Pages"
                    placeholderTextColor={theme.text.tertiary}
                        keyboardType="number-pad"
                  />
                </View>
              </View>
                </>
              )}

              {/* Step 4: Chapters & Features */}
              {step === 4 && (
                <>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                      Chapters & Features
                    </Text>
                    <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
                      Configure chapters and select which features this book enables
                    </Text>
                  </View>

              {/* Chapters */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Total Chapters</Text>
                    <View style={styles.row}>
                <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: theme.background.secondary, color: theme.text.primary, marginRight: 8 }]}
                  value={formData.totalChapters.toString()}
                  onChangeText={(text) => setFormData({ ...formData, totalChapters: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="number-pad"
                />
                      <TouchableOpacity
                        style={[styles.addChaptersButton, { backgroundColor: theme.accent.primary }]}
                        onPress={() => {
                          // Manual chapter entry
                          if (Platform.OS === 'ios') {
                            Alert.prompt(
                              'Enter Number of Chapters',
                              'How many chapters does this book have?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'OK',
                                  onPress: (chapterCountStr) => {
                                    const chapterCount = parseInt(chapterCountStr || '0', 10);
                                    if (chapterCount > 0) {
                                      // Create placeholder chapters
                                      const chapters: BookChapter[] = [];
                                      for (let i = 1; i <= chapterCount; i++) {
                                        chapters.push({ number: i, title: `Chapter ${i}` });
                                      }
                                      setFormData({ ...formData, chapters, totalChapters: chapterCount });
                                      Alert.alert('Chapters Added', `Added ${chapterCount} placeholder chapters. You can edit them after saving.`);
                                    }
                                  }
                                }
                              ],
                              'plain-text'
                            );
                          } else {
                            // For Android, use the total chapters field
                            Alert.alert(
                              'Manual Chapter Entry',
                              'Enter the total number of chapters in the field above, then tap "Add Chapters" again to create placeholder chapters.',
                              [{ text: 'OK' }]
                            );
                            // Auto-create chapters if totalChapters is set
                            if (formData.totalChapters > 0) {
                              const chapters: BookChapter[] = [];
                              for (let i = 1; i <= formData.totalChapters; i++) {
                                chapters.push({ number: i, title: `Chapter ${i}` });
                              }
                              setFormData({ ...formData, chapters });
                            }
                          }
                        }}
                      >
                        <Text style={[styles.addChaptersButtonText, { color: '#FFF' }]}>
                          Add Chapters
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.helperText, { color: theme.text.tertiary, marginTop: 8 }]}>
                      Enter the number of chapters and tap "Add Chapters" to create placeholder chapters, or process PDF from Step 2 to extract automatically.
                    </Text>
                    {Array.isArray(formData.chapters) && formData.chapters.length > 0 && (
                      <View style={styles.chaptersList}>
                        {formData.chapters.map((chapter, index) => (
                          <View key={index} style={[styles.chapterItem, { backgroundColor: theme.background.secondary }]}>
                            <Text style={[styles.chapterNumber, { color: theme.accent.primary }]}>
                              Ch. {chapter.number}
                            </Text>
                            <Text style={[styles.chapterTitle, { color: theme.text.primary }]}>
                              {chapter.title}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Enabled Features */}
                  <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Features This Book Enables</Text>
                <Text style={[styles.helperText, { color: theme.text.tertiary, marginBottom: 12 }]}>
                  Select which features should be unlocked when users purchase/select this book
                </Text>
                <ScrollView style={styles.featuresList} nestedScrollEnabled>
                  {availableFeatures.map((feature) => {
                    const isSelected = formData.enabledFeatures?.includes(feature.featureId) || false;
                    return (
                      <TouchableOpacity
                        key={feature.id}
                        style={[
                          styles.featureItem,
                          {
                            backgroundColor: isSelected ? theme.accent.primary + '20' : theme.background.secondary,
                            borderColor: isSelected ? theme.accent.primary : theme.border.light,
                          }
                        ]}
                        onPress={() => toggleFeature(feature.featureId)}
                      >
                        <View style={styles.featureItemContent}>
                          <Text style={[styles.featureItemName, { color: theme.text.primary }]}>
                            {feature.name}
                          </Text>
                          {feature.description && (
                            <Text style={[styles.featureItemDesc, { color: theme.text.secondary }]} numberOfLines={1}>
                              {feature.description}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Check size={20} color={theme.accent.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                  </View>
                </>
              )}

              {/* Step 5: Settings */}
              {step === 5 && (
                <>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
                      Book Settings
                    </Text>
                    <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
                      Configure publication status and display options
                    </Text>
              </View>

              {/* Status */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Status</Text>
                <View style={styles.statusOptions}>
                  {(['draft', 'published', 'archived'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: formData.status === status ? theme.accent.primary : theme.background.secondary,
                          borderColor: formData.status === status ? theme.accent.primary : theme.border.light,
                        }
                      ]}
                      onPress={() => setFormData({ ...formData, status })}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        { color: formData.status === status ? '#FFF' : theme.text.primary }
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Featured & Display Order */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Display Order</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={formData.displayOrder.toString()}
                    onChangeText={(text) => setFormData({ ...formData, displayOrder: parseInt(text) || 0 })}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Featured</Text>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: formData.isFeatured ? theme.accent.primary : theme.background.secondary,
                        borderColor: formData.isFeatured ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                  >
                    {formData.isFeatured && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                </View>
              </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border.light }]}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.footerButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              {step > 1 && (
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary, { backgroundColor: theme.background.secondary }]}
                  onPress={handlePrevious}
                >
                  <ChevronLeft size={18} color={theme.text.primary} />
                  <Text style={[styles.footerButtonText, { color: theme.text.primary }]}>Previous</Text>
                </TouchableOpacity>
              )}

              {step < totalSteps ? (
                <TouchableOpacity
                  style={[styles.footerButton, { backgroundColor: theme.accent.primary }]}
                  onPress={handleNext}
                >
                  <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Next</Text>
                  <ChevronRight size={18} color="#FFF" />
                </TouchableOpacity>
              ) : (
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
                disabled={isUploadingDocument}
              >
                {isUploadingDocument ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFF" />
                    <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  bookCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  featuredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookMetaText: {
    fontSize: 12,
  },
  bookDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  documentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  documentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bookStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
  },
  bookActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentPreviewContainer: {
    marginTop: 8,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  documentPreviewText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  footerButtonSecondary: {
    flex: 0,
    marginRight: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  processButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chaptersList: {
    marginTop: 12,
    gap: 8,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  chapterNumber: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 50,
  },
  chapterTitle: {
    fontSize: 14,
    flex: 1,
  },
  featuresList: {
    maxHeight: 200,
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  featureItemContent: {
    flex: 1,
    marginRight: 12,
  },
  featureItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureItemDesc: {
    fontSize: 12,
  },
  addChaptersButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChaptersButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

