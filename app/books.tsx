import { Stack, router } from 'expo-router';
import { BookOpen, ArrowLeft, Star, Package } from 'lucide-react-native';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getAllPublishedBooks } from '@/lib/book-service';
import type { Book } from '@/types/books';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BooksScreen() {
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadBooks();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const publishedBooks = await getAllPublishedBooks();
      setBooks(publishedBooks);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const featuredBooks = books.filter(b => b.isFeatured);
  const regularBooks = books.filter(b => !b.isFeatured);

  const handleBookPress = (book: Book) => {
    // For now, open external link or show book details
    // In the future, this could navigate to a book detail page
    if (book.documentFileUrl) {
      Linking.openURL(book.documentFileUrl);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'DreamBig Books', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>DreamBig Books</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
            Business guides & resources
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent.primary} />
              <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                Loading books...
              </Text>
            </View>
          ) : books.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={64} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No books available
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                Check back later for new books
              </Text>
            </View>
          ) : (
            <>
              {featuredBooks.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                    Featured Books
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {featuredBooks.map((book) => (
                      <TouchableOpacity
                        key={book.id}
                        style={[styles.featuredCard, { backgroundColor: theme.background.card }]}
                        onPress={() => handleBookPress(book)}
                      >
                        {book.coverImage ? (
                          <Image source={{ uri: book.coverImage }} style={styles.featuredImage} />
                        ) : (
                          <View style={[styles.featuredImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                            <BookOpen size={48} color={theme.text.tertiary} />
                          </View>
                        )}
                        <View style={styles.featuredContent}>
                          <View style={styles.featuredHeader}>
                            <Text style={[styles.featuredTitle, { color: theme.text.primary }]} numberOfLines={2}>
                              {book.title}
                            </Text>
                            <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                              <Star size={12} color={theme.accent.primary} fill={theme.accent.primary} />
                            </View>
                          </View>
                          {book.subtitle && (
                            <Text style={[styles.featuredSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
                              {book.subtitle}
                            </Text>
                          )}
                          <View style={styles.featuredFooter}>
                            <Text style={[styles.featuredPrice, { color: theme.accent.primary }]}>
                              {book.currency} {book.price.toFixed(2)}
                            </Text>
                            {book.totalChapters > 0 && (
                              <Text style={[styles.featuredChapters, { color: theme.text.tertiary }]}>
                                {book.totalChapters} chapters
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                  All Books ({books.length})
                </Text>
                <View style={styles.booksGrid}>
                  {books.map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      style={[styles.bookCard, { backgroundColor: theme.background.card }]}
                      onPress={() => handleBookPress(book)}
                    >
                      {book.coverImage ? (
                        <Image source={{ uri: book.coverImage }} style={styles.bookImage} />
                      ) : (
                        <View style={[styles.bookImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                          <BookOpen size={32} color={theme.text.tertiary} />
                        </View>
                      )}
                      <View style={styles.bookContent}>
                        <View style={styles.bookHeader}>
                          <Text style={[styles.bookTitle, { color: theme.text.primary }]} numberOfLines={2}>
                            {book.title}
                          </Text>
                          {book.isFeatured && (
                            <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                              <Star size={10} color={theme.accent.primary} fill={theme.accent.primary} />
                            </View>
                          )}
                        </View>
                        {book.subtitle && (
                          <Text style={[styles.bookSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
                            {book.subtitle}
                          </Text>
                        )}
                        {book.description && (
                          <Text style={[styles.bookDescription, { color: theme.text.secondary }]} numberOfLines={2}>
                            {book.description}
                          </Text>
                        )}
                        <View style={styles.bookFooter}>
                          <Text style={[styles.bookPrice, { color: theme.accent.primary }]}>
                            {book.currency} {book.price.toFixed(2)}
                          </Text>
                          {book.totalChapters > 0 && (
                            <Text style={[styles.bookChapters, { color: theme.text.tertiary }]}>
                              {book.totalChapters} ch.
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredContent: {
    padding: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  featuredTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  featuredBadge: {
    padding: 4,
    borderRadius: 12,
  },
  featuredSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  featuredChapters: {
    fontSize: 12,
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
    height: 180,
    resizeMode: 'cover',
  },
  bookImagePlaceholder: {
    width: '100%',
    height: 180,
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
    fontSize: 16,
    fontWeight: '700',
  },
  bookSubtitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  bookDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookChapters: {
    fontSize: 11,
  },
});

