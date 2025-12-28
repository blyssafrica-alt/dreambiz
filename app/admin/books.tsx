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
import { ArrowLeft, Plus, Edit, Trash2, Book, X, ImageIcon, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Book, BookFormData, BookChapter } from '@/types/books';

export default function BooksManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookFormData>({
    slug: '',
    title: '',
    subtitle: '',
    description: '',
    coverImage: undefined,
    price: 0,
    currency: 'USD',
    salePrice: undefined,
    saleStartDate: undefined,
    saleEndDate: undefined,
    totalChapters: 0,
    chapters: [],
    author: '',
    isbn: '',
    publicationDate: undefined,
    pageCount: undefined,
    status: 'draft',
    isFeatured: false,
    displayOrder: 0,
  });

  useEffect(() => {
    loadBooks();
  }, []);

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
          price: parseFloat(row.price || '0'),
          currency: row.currency || 'USD',
          salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
          saleStartDate: row.sale_start_date,
          saleEndDate: row.sale_end_date,
          totalChapters: row.total_chapters || 0,
          chapters: row.chapters || [],
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
    });

    if (!result.canceled && result.assets[0]) {
      setFormData({ ...formData, coverImage: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      Alert.alert('Missing Fields', 'Please fill in slug and title');
      return;
    }

    try {
      const bookData: any = {
        slug: formData.slug,
        title: formData.title,
        subtitle: formData.subtitle || null,
        description: formData.description || null,
        cover_image: formData.coverImage || null,
        price: formData.price,
        currency: formData.currency,
        sale_price: formData.salePrice || null,
        sale_start_date: formData.saleStartDate || null,
        sale_end_date: formData.saleEndDate || null,
        total_chapters: formData.totalChapters,
        chapters: JSON.stringify(formData.chapters),
        author: formData.author || null,
        isbn: formData.isbn || null,
        publication_date: formData.publicationDate || null,
        page_count: formData.pageCount || null,
        status: formData.status,
        is_featured: formData.isFeatured,
        display_order: formData.displayOrder,
      };

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
    setFormData({
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      coverImage: book.coverImage,
      price: book.price,
      currency: book.currency,
      salePrice: book.salePrice,
      saleStartDate: book.saleStartDate,
      saleEndDate: book.saleEndDate,
      totalChapters: book.totalChapters,
      chapters: book.chapters,
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
    setFormData({
      slug: '',
      title: '',
      subtitle: '',
      description: '',
      coverImage: undefined,
      price: 0,
      currency: 'USD',
      salePrice: undefined,
      saleStartDate: undefined,
      saleEndDate: undefined,
      totalChapters: 0,
      chapters: [],
      author: '',
      isbn: '',
      publicationDate: undefined,
      pageCount: undefined,
      status: 'draft',
      isFeatured: false,
      displayOrder: 0,
    });
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
            <Book size={48} color={theme.text.tertiary} />
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

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Book' : 'Add New Book'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
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

              {/* Basic Info */}
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

              {/* Chapters */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Total Chapters</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={formData.totalChapters.toString()}
                  onChangeText={(text) => setFormData({ ...formData, totalChapters: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="number-pad"
                />
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
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border.light }]}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.footerButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Save size={18} color="#FFF" />
                <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Save</Text>
              </TouchableOpacity>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
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
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

