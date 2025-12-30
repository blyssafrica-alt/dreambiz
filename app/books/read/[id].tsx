/**
 * Book Reader Screen
 * Displays PDF books in a WebView for reading
 */

import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { ArrowLeft, Download, Share2, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

export default function BookReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadBook();
  }, [id, user]);

  const loadBook = async () => {
    if (!id || !user) {
      setError('Book ID or user not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify user has purchased and has access to this book
      const { data: purchase, error: purchaseError } = await supabase
        .from('book_purchases')
        .select(`
          id,
          access_granted,
          books (
            id,
            title,
            document_file_url
          )
        `)
        .eq('book_id', id)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .eq('access_granted', true)
        .single();

      if (purchaseError || !purchase) {
        setError('You do not have access to this book. Please purchase it first.');
        setLoading(false);
        return;
      }

      const book = (purchase as any).books;
      if (!book || !book.document_file_url) {
        setError('Book document not available. Please contact support.');
        setLoading(false);
        return;
      }

      // Get signed URL from Supabase Storage if it's a storage URL
      let fileUrl = book.document_file_url;
      
      // If it's a Supabase storage URL, get a signed URL
      if (fileUrl.includes('supabase.co/storage')) {
        try {
          // Extract bucket and path from URL
          const urlParts = fileUrl.split('/storage/v1/object/public/');
          if (urlParts.length === 2) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');
            
            // Get signed URL (valid for 1 hour)
            const { data: signedData, error: signedError } = await supabase
              .storage
              .from(bucket)
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (!signedError && signedData) {
              fileUrl = signedData.signedUrl;
            }
          }
        } catch (urlError) {
          console.warn('Could not create signed URL, using original:', urlError);
        }
      }

      setBookUrl(fileUrl);
    } catch (err: any) {
      console.error('Error loading book:', err);
      setError(err.message || 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!bookUrl) {
      RNAlert.alert('Error', 'Book URL not available');
      return;
    }

    try {
      setDownloading(true);

      // Get book title for filename
      const { data: purchase } = await supabase
        .from('book_purchases')
        .select(`
          books (title)
        `)
        .eq('book_id', id)
        .eq('user_id', user?.id)
        .single();

      const bookTitle = (purchase as any)?.books?.title || 'DreamBig-Book';
      const sanitizedTitle = bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}.pdf`;

      // Download file
      const docDir = (FileSystem as any).documentDirectory;
      if (!docDir) {
        throw new Error('Document directory not available');
      }
      const downloadResumable = FileSystem.createDownloadResumable(
        bookUrl,
        `${docDir}${filename}`,
        {}
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed');
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(result.uri);
        RNAlert.alert('Success', 'Book downloaded successfully! You can find it in your downloads.');
      } else {
        RNAlert.alert('Download Complete', `Book saved to: ${result.uri}`);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      RNAlert.alert('Download Failed', err.message || 'Failed to download book. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!bookUrl) {
      RNAlert.alert('Error', 'Book URL not available');
      return;
    }

    try {
      // Open in browser for sharing
      await WebBrowser.openBrowserAsync(bookUrl);
    } catch (err: any) {
      console.error('Share error:', err);
      RNAlert.alert('Error', 'Failed to open book for sharing');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading book...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Book Reader</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text.primary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.accent.primary }]}
            onPress={loadBook}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Reading Book</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleDownload}
            disabled={downloading}
            style={styles.headerButton}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={theme.accent.primary} />
            ) : (
              <Download size={20} color={theme.accent.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.headerButton}
          >
            <Share2 size={20} color={theme.accent.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView for PDF */}
      {bookUrl && (
        <WebView
          source={{ 
            uri: bookUrl,
            headers: {
              'Accept': 'application/pdf',
            }
          }}
          style={styles.webview}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={theme.accent.primary} />
              <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading book...</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            // Try opening in external browser as fallback
            if (nativeEvent.description?.includes('net::ERR')) {
              WebBrowser.openBrowserAsync(bookUrl).catch(() => {
                setError('Failed to load book. Please try downloading it instead.');
              });
            } else {
              setError('Failed to load book. The file may be corrupted or unavailable.');
            }
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            if (nativeEvent.statusCode === 403 || nativeEvent.statusCode === 404) {
              setError('Book not found or access denied. Please contact support.');
            } else {
              // Try opening in external browser as fallback
              WebBrowser.openBrowserAsync(bookUrl).catch(() => {
                setError('Failed to load book. Please try downloading it instead.');
              });
            }
          }}
          onShouldStartLoadWithRequest={(request) => {
            // Allow navigation within the PDF
            if (!bookUrl) return false;
            const baseUrl = bookUrl.split('?')[0];
            return request.url === bookUrl || request.url.startsWith(baseUrl);
          }}
        />
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
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
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

