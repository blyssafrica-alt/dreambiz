import { supabase } from './supabase';
import type { Book, BookChapter } from '@/types/books';
import type { DreamBigBook } from '@/types/business';

/**
 * Fetch book information from database by slug
 */
export async function getBookBySlug(slug: string): Promise<Book | null> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      coverImage: data.cover_image,
      documentFileUrl: data.document_file_url,
      price: parseFloat(data.price || '0'),
      currency: data.currency || 'USD',
      salePrice: data.sale_price ? parseFloat(data.sale_price) : undefined,
      saleStartDate: data.sale_start_date,
      saleEndDate: data.sale_end_date,
      totalChapters: data.total_chapters || 0,
      chapters: Array.isArray(data.chapters) ? data.chapters : (typeof data.chapters === 'string' ? JSON.parse(data.chapters) : []),
      author: data.author,
      isbn: data.isbn,
      publicationDate: data.publication_date,
      pageCount: data.page_count,
      status: data.status,
      isFeatured: data.is_featured || false,
      displayOrder: data.display_order || 0,
      totalSales: data.total_sales || 0,
      totalRevenue: parseFloat(data.total_revenue || '0'),
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Failed to fetch book:', error);
    return null;
  }
}

/**
 * Fetch all published books
 */
export async function getAllPublishedBooks(): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (!data) return [];

    return data.map((row: any) => ({
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
      chapters: Array.isArray(row.chapters) ? row.chapters : (typeof row.chapters === 'string' ? JSON.parse(row.chapters) : []),
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
    }));
  } catch (error) {
    console.error('Failed to fetch books:', error);
    return [];
  }
}

/**
 * Get chapter information from database book
 */
export function getChapterFromBook(book: Book | null, chapterNumber: number): BookChapter | null {
  if (!book || !book.chapters) return null;
  
  const chapter = book.chapters.find(ch => ch.number === chapterNumber);
  return chapter || null;
}

/**
 * Get chapter for topic from database book
 * This replaces the hardcoded getChapterForTopic function
 */
export async function getChapterForTopic(
  userBookSlug: DreamBigBook | undefined,
  topic: string
): Promise<{ book: string; chapter: number; chapterTitle: string } | undefined> {
  if (!userBookSlug || userBookSlug === 'none') return undefined;

  try {
    const book = await getBookBySlug(userBookSlug);
    if (!book || !book.chapters) return undefined;

    // Search for chapter that might contain this topic
    // This is a simple search - in production, you might want to add topic tags to chapters
    const matchingChapter = book.chapters.find(ch => 
      ch.title?.toLowerCase().includes(topic.toLowerCase()) ||
      ch.description?.toLowerCase().includes(topic.toLowerCase())
    );

    if (matchingChapter) {
      return {
        book: book.slug,
        chapter: matchingChapter.number,
        chapterTitle: matchingChapter.title,
      };
    }

    return undefined;
  } catch (error) {
    console.error('Failed to get chapter for topic:', error);
    return undefined;
  }
}

