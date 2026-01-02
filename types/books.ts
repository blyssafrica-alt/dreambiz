/**
 * Book management types for DreamBig books
 */

export type BookStatus = 'draft' | 'published' | 'archived';

export interface BookChapter {
  number: number;
  title: string;
  description?: string;
  pageCount?: number;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImage?: string;
  documentFileUrl?: string; // Stored file URL for PDF/document
  price: number;
  currency: string;
  salePrice?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  totalChapters: number;
  chapters: BookChapter[];
  enabledFeatures?: string[]; // Array of feature IDs this book enables
  author?: string;
  isbn?: string;
  publicationDate?: string;
  pageCount?: number;
  status: BookStatus;
  isFeatured: boolean;
  displayOrder: number;
  totalSales: number;
  totalRevenue: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookFormData {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImage?: string;
  documentFile?: string; // Local file URI for upload
  documentFileUrl?: string; // Stored file URL
  price: number;
  currency: string;
  salePrice?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  totalChapters: number;
  chapters: BookChapter[];
  enabledFeatures?: string[]; // Array of feature IDs this book enables
  author?: string;
  isbn?: string;
  publicationDate?: string;
  pageCount?: number;
  status: BookStatus;
  isFeatured: boolean;
  displayOrder: number;
}

