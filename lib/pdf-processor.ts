/**
 * PDF Processing Service
 * Extracts text, chapters, and content from PDF documents
 */

export interface ExtractedChapter {
  number: number;
  title: string;
  description?: string;
  content?: string;
  pageStart?: number;
  pageEnd?: number;
}

export interface PDFExtractionResult {
  chapters: ExtractedChapter[];
  fullText: string;
  totalPages: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * Extract text from PDF using a PDF processing service
 * Note: This requires a backend service or API to process PDFs
 * For now, we'll use a placeholder that can be connected to a real service
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // Option 1: Use a PDF processing API (e.g., pdf.js, pdf-parse, or a backend service)
    // For React Native, we'll need to fetch the PDF and process it
    
    // For now, return a placeholder - this should be replaced with actual PDF processing
    // You can use libraries like:
    // - pdf-parse (requires Node.js backend)
    // - react-native-pdf (for viewing, not extraction)
    // - A backend API service
    
    console.log('PDF extraction not yet implemented. URL:', pdfUrl);
    return '';
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    throw error;
  }
}

/**
 * Extract chapters from PDF text
 * Uses pattern matching to find chapter headings and content
 */
export function extractChaptersFromText(text: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];
  
  if (!text || text.trim().length === 0) {
    return chapters;
  }

  // Common chapter patterns
  const chapterPatterns = [
    /^Chapter\s+(\d+)[:.\s]+(.+)$/gmi,
    /^CHAPTER\s+(\d+)[:.\s]+(.+)$/gmi,
    /^(\d+)[:.\s]+(.+)$/gmi, // Just number and title
    /^Part\s+(\d+)[:.\s]+(.+)$/gmi,
    /^(\d+)\.\s+(.+)$/gmi, // Number. Title
  ];

  const lines = text.split('\n');
  let currentChapter: ExtractedChapter | null = null;
  let chapterContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Try to match chapter patterns
    let matched = false;
    for (const pattern of chapterPatterns) {
      pattern.lastIndex = 0; // Reset regex
      const match = pattern.exec(line);
      if (match) {
        // Save previous chapter if exists
        if (currentChapter) {
          currentChapter.content = chapterContent.join('\n');
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        const chapterNum = parseInt(match[1], 10);
        const chapterTitle = match[2].trim();
        
        currentChapter = {
          number: chapterNum,
          title: chapterTitle,
          content: '',
        };
        chapterContent = [];
        matched = true;
        break;
      }
    }
    
    if (!matched && currentChapter) {
      // Add line to current chapter content
      if (line.length > 0) {
        chapterContent.push(line);
      }
    }
  }
  
  // Add last chapter
  if (currentChapter) {
    currentChapter.content = chapterContent.join('\n');
    chapters.push(currentChapter);
  }

  // If no chapters found with patterns, try to extract from table of contents
  if (chapters.length === 0) {
    chapters.push(...extractChaptersFromTOC(text));
  }

  return chapters;
}

/**
 * Extract chapters from Table of Contents section
 */
function extractChaptersFromTOC(text: string): ExtractedChapter[] {
  const chapters: ExtractedChapter[] = [];
  
  // Look for Table of Contents section
  const tocPattern = /(?:Table\s+of\s+Contents|Contents|Chapters?)[\s\S]*?(?=\n\n|\nChapter|\n\d+\.|$)/i;
  const tocMatch = text.match(tocPattern);
  
  if (tocMatch) {
    const tocText = tocMatch[0];
    const lines = tocText.split('\n');
    
    for (const line of lines) {
      // Pattern: Chapter 1: Title ... Page 10
      const patterns = [
        /(?:Chapter|Ch\.?)\s*(\d+)[:.\s]+(.+?)(?:\s+\.{3,}\s*(\d+))?/i,
        /(\d+)[:.\s]+(.+?)(?:\s+\.{3,}\s*(\d+))?/,
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const chapterNum = parseInt(match[1], 10);
          const title = match[2].trim();
          const pageNum = match[3] ? parseInt(match[3], 10) : undefined;
          
          if (chapterNum > 0 && title.length > 0) {
            chapters.push({
              number: chapterNum,
              title: title,
              pageStart: pageNum,
            });
          }
          break;
        }
      }
    }
  }
  
  return chapters;
}

/**
 * Process PDF and extract all information
 */
export async function processBookPDF(pdfUrl: string): Promise<PDFExtractionResult> {
  try {
    // Extract text from PDF
    const fullText = await extractTextFromPDF(pdfUrl);
    
    // Extract chapters
    const chapters = extractChaptersFromText(fullText);
    
    // Estimate page count (rough estimate: ~500 words per page)
    const wordCount = fullText.split(/\s+/).length;
    const estimatedPages = Math.ceil(wordCount / 500);
    
    return {
      chapters,
      fullText,
      totalPages: estimatedPages,
    };
  } catch (error) {
    console.error('Failed to process PDF:', error);
    throw error;
  }
}

/**
 * Search for content in PDF text by keywords
 * Used to find relevant chapters for alerts/warnings
 */
export function findRelevantChapters(
  chapters: ExtractedChapter[],
  keywords: string[]
): ExtractedChapter[] {
  const relevant: ExtractedChapter[] = [];
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  for (const chapter of chapters) {
    const searchText = `${chapter.title} ${chapter.description || ''} ${chapter.content || ''}`.toLowerCase();
    
    const hasKeyword = lowerKeywords.some(keyword => 
      searchText.includes(keyword)
    );
    
    if (hasKeyword) {
      relevant.push(chapter);
    }
  }
  
  return relevant;
}

