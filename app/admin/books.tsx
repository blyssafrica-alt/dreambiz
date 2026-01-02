import React, { useEffect, useState } from 'react';
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
          slug: row.slug,
          title: row.title,
          subtitle: row.subtitle,
          description: row.description,
          coverImage: row.cover_image,
          documentFileUrl: row.document_file_url,
          price: parseFloat(row.price || '0'),
          currency: row.currency || 'USD',
          salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
          saleStartDate: row.sale_start_date,
          saleEndDate: row.sale_end_date,
          totalChapters: row.total_chapters || 0,
          chapters: row.chapters || [],
          enabledFeatures: row.enabled_features || [],
          author: row.author,
          isbn: row.isbn,
          publicationDate: row.publication_date,
          pageCount: row.page_count,
          status: row.status,
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

    try {
      setIsProcessingPDF(true);
      
      // bookId is now optional - we can process PDF even for new books
      // The Edge Function will extract data and return it without updating database

      // Try to call Supabase Edge Function for PDF processing
      // Using helper function for better error handling and auth management
      try {
        // Import helper function
        const { invokeEdgeFunction } = await import('@/lib/edge-function-helper');
        
        // Verify and refresh session if needed
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          Alert.alert('Authentication Error', 'Please sign in to process PDF documents.');
          setIsProcessingPDF(false);
          return;
        }

        // Check if session is expired and refresh if needed
        if (session) {
          const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
          const now = new Date();
          const expiresIn = expiresAt ? expiresAt.getTime() - now.getTime() : 0;
          
          // Refresh if expires in less than 5 minutes
          if (expiresIn < 5 * 60 * 1000) {
            console.log('Session expiring soon, refreshing...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData?.session) {
              session = refreshData.session;
              console.log('Session refreshed successfully');
            } else {
              console.warn('Failed to refresh session:', refreshError);
            }
          }
        }

        if (!session) {
          Alert.alert('Authentication Required', 'Please sign in to process PDF documents.');
          setIsProcessingPDF(false);
          return;
        }

        if (__DEV__) {
          console.log('Calling process-pdf Edge Function:', {
            pdfUrl: formData.documentFileUrl,
            hasSession: !!session,
            hasAccessToken: !!session?.access_token,
            tokenPreview: session?.access_token?.substring(0, 20) + '...',
            expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          });
        }

        // Use helper function which handles auth headers properly
        const { data, error } = await invokeEdgeFunction('process-pdf', {
          body: {
            pdfUrl: formData.documentFileUrl,
            bookId: editingId || null, // Optional - null for new books
          },
        });

        if (__DEV__) {
          console.log('process-pdf response:', { data, error });
        }

        if (error) {
          // Log error details for debugging
          console.error('Edge Function error:', {
            status: error.status,
            statusCode: error.statusCode,
            message: error.message,
            name: error.name,
          });
          
          // Check if it's a 401 (function not deployed) or network error
          if (error.status === 401 || error.statusCode === 401) {
            Alert.alert(
              'Function Not Deployed',
              'The PDF processing function is not deployed yet. Please deploy it or use manual entry.',
              [{ text: 'OK' }]
            );
            setIsProcessingPDF(false);
            return;
          }
          
          // For other errors, show helpful message
          Alert.alert(
            'PDF Processing Error',
            `Failed to process PDF: ${error.message || 'Unknown error'}\n\nPlease try manual entry.`,
            [{ text: 'OK' }]
          );
          setIsProcessingPDF(false);
          return;
        }

        if (data) {
          // Check if function returned success
          if (data.success && data.data) {
            const extractedData = data.data;
            
            // Update form with extracted information
            const updatedFormData: any = { ...formData };
            
            // Update page count if extracted
            if (extractedData.pageCount && extractedData.pageCount > 0) {
              updatedFormData.pageCount = extractedData.pageCount;
            }
            
            // Update chapters if extracted
            if (extractedData.chapters && extractedData.chapters.length > 0) {
              updatedFormData.chapters = extractedData.chapters;
              updatedFormData.totalChapters = extractedData.chapters.length;
              setFormData(updatedFormData);
              setIsProcessingPDF(false);
              Alert.alert(
                'Success', 
                `PDF processed successfully!\n\n• Pages: ${extractedData.pageCount || 'N/A'}\n• Chapters: ${extractedData.chapters.length}`
              );
              return; // Successfully extracted chapters, don't show manual entry
            } else if (extractedData.pageCount && extractedData.pageCount > 0) {
              // Only page count extracted, no chapters
              updatedFormData.pageCount = extractedData.pageCount;
              setFormData(updatedFormData);
              setIsProcessingPDF(false);
              Alert.alert(
                'PDF Processed', 
                `PDF processed successfully!\n\n• Pages: ${extractedData.pageCount}\n• Chapters: Please enter manually in Step 4.`
              );
              return; // Page count extracted, don't show manual entry alert
            } else {
              // No data extracted - function suggests manual entry
              setIsProcessingPDF(false);
              // Fall through to manual entry option below
            }
          } else if (data.success === false) {
            // Function returned error but with success: false
            setIsProcessingPDF(false);
            Alert.alert(
              'PDF Processing',
              data.message || 'Could not extract information from PDF. Please use manual entry.',
              [{ text: 'OK' }]
            );
            // Fall through to manual entry option
          } else {
            // Unexpected response format
            console.warn('Unexpected response format:', data);
            setIsProcessingPDF(false);
            // Fall through to manual entry option
          }
        } else {
          // No data returned
          console.warn('No data returned from Edge Function');
          setIsProcessingPDF(false);
          // Fall through to manual entry option
        }
      } catch (edgeFunctionError: any) {
        // Edge Function might not be deployed or there's a network error
        console.error('Exception calling Edge Function:', {
          error: edgeFunctionError,
          message: edgeFunctionError?.message,
          stack: edgeFunctionError?.stack,
        });
        
        setIsProcessingPDF(false);
        
        // Show helpful error message
        Alert.alert(
          'PDF Processing Unavailable',
          `The PDF processing service is not available.\n\nError: ${edgeFunctionError?.message || 'Network or deployment error'}\n\nPlease use manual entry.`,
          [{ text: 'OK' }]
        );
        // Fall through to manual entry option
      }

      // Fallback to manual entry
      Alert.alert(
        'PDF Processing',
        'Automatic PDF processing is not available. You can enter chapter information manually.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Chapters Manually',
            onPress: () => {
              // Use Alert.prompt for React Native (iOS only, Android needs custom solution)
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
            if (!currentRequiresBook.includes(formData.slug)) {
              const updatedRequiresBook = [...currentRequiresBook, formData.slug];
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
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      coverImage: book.coverImage,
      documentFile: undefined,
      documentFileUrl: book.documentFileUrl,
      price: book.price,
      currency: book.currency,
      salePrice: book.salePrice,
      saleStartDate: book.saleStartDate,
      saleEndDate: book.saleEndDate,
      totalChapters: book.totalChapters,
      chapters: book.chapters,
      enabledFeatures: book.enabledFeatures || [],
      author: book.author,
      isbn: book.isbn,
      publicationDate: book.publicationDate,
      pageCount: book.pageCount,
      status: book.status,
      isFeatured: book.isFeatured,
      displayOrder: book.displayOrder,
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
        {books.length === 0 ? (
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
          books.map((book) => (
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
                    {book.title}
                  </Text>
                  {book.isFeatured && (
                    <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                      <Text style={[styles.featuredText, { color: theme.accent.primary }]}>
                        Featured
                      </Text>
                    </View>
                  )}
                </View>
                {book.subtitle && (
                  <Text style={[styles.bookSubtitle, { color: theme.text.secondary }]}>
                    {book.subtitle}
                  </Text>
                )}
                <View style={styles.bookMeta}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(book.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(book.status) }]}>
                      {book.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.bookMetaText, { color: theme.text.tertiary }]}>
                    {book.totalChapters} chapters
                  </Text>
                  <Text style={[styles.bookMetaText, { color: theme.text.tertiary }]}>
                    ${book.price.toFixed(2)}
                  </Text>
                </View>
                {book.documentFileUrl && (
                  <View style={[styles.documentBadge, { backgroundColor: theme.surface.info }]}>
                    <FileText size={12} color={theme.accent.info} />
                    <Text style={[styles.documentBadgeText, { color: theme.accent.info }]}>
                      Document Available
                    </Text>
                  </View>
                )}
                {book.description && (
                  <Text 
                    style={[styles.bookDescription, { color: theme.text.secondary }]}
                    numberOfLines={2}
                  >
                    {book.description}
                  </Text>
                )}
                <View style={styles.bookStats}>
                  <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                    Sales: {book.totalSales}
                  </Text>
                  <Text style={[styles.statText, { color: theme.text.tertiary }]}>
                    Revenue: ${book.totalRevenue.toFixed(2)}
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
          ))
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
                  {step === 1 && 'Basic Information'}
                  {step === 2 && 'Media & Documents'}
                  {step === 3 && 'Pricing & Metadata'}
                  {step === 4 && 'Chapters & Features'}
                  {step === 5 && 'Settings'}
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
                      value={formData.slug}
                      onChangeText={(text) => setFormData({ ...formData, slug: text.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="e.g., start-your-business"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Title *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.title}
                      onChangeText={(text) => setFormData({ ...formData, title: text })}
                      placeholder="Book title"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Subtitle</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.subtitle}
                      onChangeText={(text) => setFormData({ ...formData, subtitle: text })}
                      placeholder="Book subtitle"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.description}
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
                    value={formData.currency}
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
                      value={formData.author}
                      onChangeText={(text) => setFormData({ ...formData, author: text })}
                      placeholder="Author name"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>ISBN</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.isbn}
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
                        value={formData.publicationDate || ''}
                        onChangeText={(text) => setFormData({ ...formData, publicationDate: text })}
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
                    {formData.chapters.length > 0 && (
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

