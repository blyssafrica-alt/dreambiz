import { Stack, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, BookOpen, Download, CheckCircle, Eye } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types/books';
import * as Linking from 'expo-linking';
import { Alert as RNAlert } from 'react-native';

interface PurchasedBook {
  id: string;
  book: Book;
  purchasedAt: string;
  accessGranted: boolean;
}

export default function MyLibraryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [purchasedBooks, setPurchasedBooks] = useState<PurchasedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPurchasedBooks();
  }, [user]);

  const loadPurchasedBooks = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('book_purchases')
        .select(`
          *,
          books (*)
        `)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .eq('access_granted', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const books: PurchasedBook[] = data.map((row: any) => {
          const bookData = row.books;
          return {
            id: row.id,
            book: {
              id: bookData.id,
              slug: bookData.slug,
              title: bookData.title,
              subtitle: bookData.subtitle,
              description: bookData.description,
              coverImage: bookData.cover_image,
              documentFileUrl: bookData.document_file_url,
              price: parseFloat(bookData.price || '0'),
              currency: bookData.currency || 'USD',
              salePrice: bookData.sale_price ? parseFloat(bookData.sale_price) : undefined,
              saleStartDate: bookData.sale_start_date,
              saleEndDate: bookData.sale_end_date,
              totalChapters: bookData.total_chapters || 0,
              chapters: Array.isArray(bookData.chapters) ? bookData.chapters : (typeof bookData.chapters === 'string' ? JSON.parse(bookData.chapters) : []),
              author: bookData.author,
              isbn: bookData.isbn,
              publicationDate: bookData.publication_date,
              pageCount: bookData.page_count,
              status: bookData.status,
              isFeatured: bookData.is_featured || false,
              displayOrder: bookData.display_order || 0,
              totalSales: bookData.total_sales || 0,
              totalRevenue: parseFloat(bookData.total_revenue || '0'),
              createdBy: bookData.created_by,
              createdAt: bookData.created_at,
              updatedAt: bookData.updated_at,
            },
            purchasedAt: row.created_at,
            accessGranted: row.access_granted,
          };
        });
        setPurchasedBooks(books);
      }
    } catch (error) {
      console.error('Failed to load purchased books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookPress = (book: Book) => {
    router.push(`/books/${book.id}` as any);
  };

  const handleReadBook = (book: Book) => {
    if (!book.documentFileUrl) {
      RNAlert.alert('Book Not Available', 'This book does not have a document file yet.');
      return;
    }
    router.push(`/books/read/${book.id}` as any);
  };

  const handleDownloadBook = async (book: Book) => {
    if (!book.documentFileUrl) {
      RNAlert.alert('Book Not Available', 'This book does not have a document file yet.');
      return;
    }

    try {
      // Get signed URL if it's a Supabase storage URL
      let fileUrl = book.documentFileUrl;
      
      if (fileUrl.includes('supabase.co/storage')) {
        try {
          const urlParts = fileUrl.split('/storage/v1/object/public/');
          if (urlParts.length === 2) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');
            
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(filePath, 3600);

            if (!signedError && signedData) {
              fileUrl = signedData.signedUrl;
            }
          }
        } catch (urlError) {
          console.warn('Could not create signed URL:', urlError);
        }
      }

      // Download file
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      
      const sanitizedTitle = book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}.pdf`;
      const docDir = (FileSystem as any).documentDirectory;
      if (!docDir) {
        throw new Error('Document directory not available');
      }
      const fileUri = `${docDir}${filename}`;

      const downloadResumable = (FileSystem as any).createDownloadResumable(
        fileUrl,
        fileUri,
        {}
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed');
      }

      // Share/download the file
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(result.uri);
        RNAlert.alert('Success', 'Book downloaded successfully!');
      } else {
        // Fallback: open in browser
        await Linking.openURL(fileUrl);
        RNAlert.alert('Download Started', 'The book will open in your browser for download.');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      RNAlert.alert('Download Failed', error.message || 'Failed to download book. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'My Library', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>My Library</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading your books...</Text>
        </View>
      ) : purchasedBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.primary }]}>No books purchased yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.text.secondary }]}>
            Browse our collection and purchase books to add them to your library
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: theme.accent.primary }]}
            onPress={() => router.push('/books' as any)}
          >
            <Text style={styles.browseButtonText}>Browse Books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.statNumber, { color: theme.accent.primary }]}>
                {purchasedBooks.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Books Owned</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Your Books</Text>
          
          <View style={styles.booksGrid}>
            {purchasedBooks.map((purchasedBook) => (
              <TouchableOpacity
                key={purchasedBook.id}
                style={[styles.bookCard, { backgroundColor: theme.background.card }]}
                onPress={() => handleBookPress(purchasedBook.book)}
              >
                {purchasedBook.book.coverImage ? (
                  <Image source={{ uri: purchasedBook.book.coverImage }} style={styles.bookImage} />
                ) : (
                  <View style={[styles.bookImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                    <BookOpen size={32} color={theme.text.tertiary} />
                  </View>
                )}
                <View style={styles.bookContent}>
                  <View style={styles.bookHeader}>
                    <Text style={[styles.bookTitle, { color: theme.text.primary }]} numberOfLines={2}>
                      {purchasedBook.book.title}
                    </Text>
                    {purchasedBook.accessGranted && (
                      <View style={[styles.accessBadge, { backgroundColor: '#10B98120' }]}>
                        <CheckCircle size={12} color="#10B981" />
                      </View>
                    )}
                  </View>
                  {purchasedBook.book.subtitle && (
                    <Text style={[styles.bookSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
                      {purchasedBook.book.subtitle}
                    </Text>
                  )}
                  <Text style={[styles.purchasedDate, { color: theme.text.tertiary }]}>
                    Purchased {new Date(purchasedBook.purchasedAt).toLocaleDateString()}
                  </Text>
                  {purchasedBook.book.documentFileUrl && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.readButton, { backgroundColor: theme.accent.primary }]}
                        onPress={() => handleReadBook(purchasedBook.book)}
                      >
                        <Eye size={14} color="#FFF" />
                        <Text style={styles.readButtonText}>Read</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.downloadButton, { backgroundColor: theme.accent.primary + '20' }]}
                        onPress={() => handleDownloadBook(purchasedBook.book)}
                      >
                        <Download size={14} color={theme.accent.primary} />
                        <Text style={[styles.downloadText, { color: theme.accent.primary }]}>Download</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginHorizontal: -8,
  },
  bookCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  bookImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookContent: {
    padding: 12,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    gap: 6,
  },
  bookTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  accessBadge: {
    padding: 4,
    borderRadius: 12,
  },
  bookSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  purchasedDate: {
    fontSize: 10,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  readButton: {
    backgroundColor: '#0066CC',
  },
  readButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

