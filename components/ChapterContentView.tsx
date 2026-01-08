import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronLeft, ChevronRight, Share2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import type { Book, BookChapter } from '@/types/books';
import * as Sharing from 'expo-sharing';

interface ChapterContentViewProps {
  chapter: BookChapter | null;
  content: string;
  book: Book;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export default function ChapterContentView({
  chapter,
  content,
  book,
  onPreviousChapter,
  onNextChapter,
  hasPrevious = false,
  hasNext = false,
}: ChapterContentViewProps) {
  const { theme } = useTheme();

  const handleShare = async () => {
    if (!chapter || !content) return;

    try {
      const shareText = `${book.title}\n\nChapter ${chapter.number}: ${chapter.title}\n\n${content.substring(0, 500)}...`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync({
          message: shareText,
          mimeType: 'text/plain',
        });
      }
    } catch (error) {
      console.error('Failed to share chapter:', error);
    }
  };

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Chapter</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Chapter not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background.card, borderBottomColor: theme.border.light }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>
            Chapter {chapter.number}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare}>
          <Share2 size={20} color={theme.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Chapter Title */}
      <View style={[styles.chapterHeader, { backgroundColor: theme.background.card, borderBottomColor: theme.border.light }]}>
        <Text style={[styles.chapterTitle, { color: theme.text.primary }]}>
          {chapter.title}
        </Text>
        {chapter.description && (
          <Text style={[styles.chapterDescription, { color: theme.text.secondary }]}>
            {chapter.description}
          </Text>
        )}
        {chapter.pageStart && chapter.pageEnd && (
          <Text style={[styles.chapterPages, { color: theme.text.tertiary }]}>
            Pages {chapter.pageStart} - {chapter.pageEnd}
          </Text>
        )}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={[styles.contentText, { color: theme.text.primary }]}>
          {content || 'Chapter content is not available.'}
        </Text>
      </ScrollView>

      {/* Navigation Footer */}
      {(hasPrevious || hasNext) && (
        <View style={[styles.footer, { backgroundColor: theme.background.card, borderTopColor: theme.border.light }]}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.background.secondary }]}
            onPress={onPreviousChapter}
            disabled={!hasPrevious}
          >
            <ChevronLeft size={20} color={hasPrevious ? theme.text.primary : theme.text.tertiary} />
            <Text style={[styles.navButtonText, { color: hasPrevious ? theme.text.primary : theme.text.tertiary }]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.background.secondary }]}
            onPress={onNextChapter}
            disabled={!hasNext}
          >
            <Text style={[styles.navButtonText, { color: hasNext ? theme.text.primary : theme.text.tertiary }]}>
              Next
            </Text>
            <ChevronRight size={20} color={hasNext ? theme.text.primary : theme.text.tertiary} />
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chapterHeader: {
    padding: 20,
    borderBottomWidth: 1,
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  chapterDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  chapterPages: {
    fontSize: 14,
    marginTop: 4,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});

