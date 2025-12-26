import type { BusinessType } from '@/types/business';

export interface BookGuidance {
  topic: string;
  bookId: string;
  chapter: string;
  chapterNumber: number;
  guidance: string;
  learnMoreUrl?: string;
}

export const BOOK_GUIDANCE: BookGuidance[] = [
  {
    topic: 'pricing',
    bookId: 'start-smart',
    chapter: 'Pricing Your Products',
    chapterNumber: 5,
    guidance: 'Set prices that cover costs and provide profit. See Chapter 5 of Start Smart for pricing strategies.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-5',
  },
  {
    topic: 'cashflow',
    bookId: 'start-smart',
    chapter: 'Managing Cashflow',
    chapterNumber: 8,
    guidance: 'Keep track of money coming in and going out. Chapter 8 explains cashflow management.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-8',
  },
  {
    topic: 'inventory',
    bookId: 'start-smart',
    chapter: 'Inventory Management',
    chapterNumber: 6,
    guidance: 'Don\'t overstock or understock. Chapter 6 covers inventory best practices.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-6',
  },
  {
    topic: 'customer-relationships',
    bookId: 'grow-big',
    chapter: 'Building Customer Relationships',
    chapterNumber: 4,
    guidance: 'Happy customers come back. Chapter 4 teaches relationship building strategies.',
    learnMoreUrl: 'https://dreambig.co.zw/books/grow-big/chapter-4',
  },
  {
    topic: 'marketing',
    bookId: 'grow-big',
    chapter: 'Marketing on a Budget',
    chapterNumber: 7,
    guidance: 'Effective marketing doesn\'t have to be expensive. See Chapter 7 for budget-friendly strategies.',
    learnMoreUrl: 'https://dreambig.co.zw/books/grow-big/chapter-7',
  },
  {
    topic: 'budgeting',
    bookId: 'start-smart',
    chapter: 'Creating a Budget',
    chapterNumber: 7,
    guidance: 'A budget helps you plan and control spending. Chapter 7 shows you how to create one.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-7',
  },
  {
    topic: 'profit',
    bookId: 'start-smart',
    chapter: 'Understanding Profit',
    chapterNumber: 3,
    guidance: 'Profit = Sales - Expenses. Chapter 3 explains profit fundamentals.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-3',
  },
  {
    topic: 'expenses',
    bookId: 'start-smart',
    chapter: 'Controlling Expenses',
    chapterNumber: 9,
    guidance: 'Track every expense. Chapter 9 teaches expense management.',
    learnMoreUrl: 'https://dreambig.co.zw/books/start-smart/chapter-9',
  },
];

export function getGuidanceForTopic(topic: string, bookId?: string): BookGuidance | null {
  const guidance = BOOK_GUIDANCE.find(g => 
    g.topic === topic && (!bookId || g.bookId === bookId)
  );
  return guidance || null;
}

export function getAllGuidanceForBook(bookId: string): BookGuidance[] {
  return BOOK_GUIDANCE.filter(g => g.bookId === bookId);
}

