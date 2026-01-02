// Supabase Edge Function: Process PDF and Extract Chapters
// This function processes uploaded PDF documents and extracts chapter information

/// <reference path="./deno.d.ts" />
/// <reference lib="dom" />

// @ts-ignore - Deno std library import (works at runtime in Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - ESM import for Supabase client (works at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Chapter {
  number: number;
  title: string;
  description?: string;
  content?: string;
  pageStart?: number;
  pageEnd?: number;
}

interface PDFExtractionResult {
  chapters: Chapter[];
  fullText: string;
  totalPages: number;
  pageCount: number;
}

/**
 * Extract chapters from PDF text using pattern matching
 */
function extractChaptersFromText(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  
  if (!text || text.trim().length === 0) {
    return chapters;
  }

  // Common chapter patterns
  const chapterPatterns = [
    /^Chapter\s+(\d+)[:.\s]+(.+)$/gmi,
    /^CHAPTER\s+(\d+)[:.\s]+(.+)$/gmi,
    /^(\d+)[:.\s]+(.+)$/gmi,
    /^Part\s+(\d+)[:.\s]+(.+)$/gmi,
    /^(\d+)\.\s+(.+)$/gmi,
  ];

  const lines = text.split('\n');
  let currentChapter: Chapter | null = null;
  let chapterContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Try to match chapter patterns
    let matched = false;
    for (const pattern of chapterPatterns) {
      pattern.lastIndex = 0;
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

  return chapters;
}

/**
 * Extract page count from PDF structure
 * Parses PDF binary to find page count without requiring PDF.js
 */
function extractPageCountFromPDFStructure(arrayBuffer: ArrayBuffer): number {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    // Method 1: Look for /Count in pages object (most reliable)
    const countMatches = pdfString.match(/\/Count\s+(\d+)/g);
    if (countMatches && countMatches.length > 0) {
      // Get the last match (usually the root pages count)
      const lastMatch = countMatches[countMatches.length - 1];
      const pageCount = parseInt(lastMatch.match(/\d+/)?.[0] || '0', 10);
      if (pageCount > 0) {
        console.log(`Extracted page count from /Count: ${pageCount}`);
        return pageCount;
      }
    }
    
    // Method 2: Look for /Type /Page objects (count page objects)
    const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) {
      const pageCount = pageMatches.length;
      console.log(`Extracted page count from /Type /Page: ${pageCount}`);
      return pageCount;
    }
    
    // Method 3: Estimate based on file size (rough estimate: ~50KB per page for text, ~200KB for images)
    const estimatedPages = Math.max(1, Math.ceil(arrayBuffer.byteLength / 50000));
    console.log(`Estimated page count from size: ${estimatedPages}`);
    return estimatedPages;
  } catch (error) {
    console.error('Error extracting page count:', error);
    // Fallback: estimate based on file size
    return Math.max(1, Math.ceil(arrayBuffer.byteLength / 50000));
  }
}

/**
 * Extract text and metadata from PDF
 * Uses PDF.js from CDN if available, otherwise extracts basic metadata
 */
async function extractTextFromPDF(pdfUrl: string, supabaseClient?: any): Promise<{ text: string; pageCount: number }> {
  try {
    // Fetch PDF - handle Supabase Storage URLs that might need authentication
    let response: Response;
    
    // Check if it's a Supabase Storage URL
    if (pdfUrl.includes('supabase.co/storage') && supabaseClient) {
      // Extract bucket and path from URL
      const urlMatch = pdfUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
      if (urlMatch) {
        const [, bucket, path] = urlMatch;
        // Use Supabase client to download the file
        const { data, error } = await supabaseClient.storage.from(bucket).download(path);
        if (error) {
          throw new Error(`Failed to download PDF from storage: ${error.message}`);
        }
        // Convert blob to arrayBuffer
        const arrayBuffer = await data.arrayBuffer();
        return await processPDFBuffer(arrayBuffer);
      }
    }
    
    // Regular fetch for public URLs
    response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await processPDFBuffer(arrayBuffer);
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
}

/**
 * Process PDF buffer to extract text and page count
 */
async function processPDFBuffer(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    console.log('PDF fetched, size:', arrayBuffer.byteLength);
    
    // First, extract page count from PDF structure (always works)
    const pageCount = extractPageCountFromPDFStructure(arrayBuffer);
    
    // Try to extract text using PDF.js (optional, may not work in all Deno environments)
    try {
      // Import PDF.js from CDN (works in Deno)
      // @ts-ignore - PDF.js from CDN
      const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
      
      if (!pdfjsLib || !pdfjsLib.getDocument) {
        throw new Error('PDF.js library not loaded correctly');
      }
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      if (!pdf || !pdf.numPages) {
        throw new Error('Failed to load PDF document');
      }
      
      const verifiedPageCount = pdf.numPages;
      console.log(`PDF.js verified: ${verifiedPageCount} pages`);
      
      // Extract text from all pages (limit to first 50 pages for performance)
      let fullText = '';
      const maxPages = Math.min(verifiedPageCount, 50);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items from the page
          if (textContent && textContent.items) {
            const pageText = textContent.items
              .map((item: any) => item.str || '')
              .filter((str: string) => str.length > 0)
              .join(' ');
            
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          }
        } catch (pageError) {
          console.warn(`Error extracting page ${pageNum}:`, pageError);
          // Continue with next page
        }
      }
      
      console.log(`Extracted ${fullText.length} characters from ${maxPages} pages`);
      
      return {
        text: fullText,
        pageCount: verifiedPageCount,
      };
    } catch (pdfjsError: any) {
      console.warn('PDF.js extraction failed, using structure-based extraction:', pdfjsError?.message || pdfjsError);
      // PDF.js failed, but we still have page count
      return {
        text: '',
        pageCount: pageCount,
      };
    }
  } catch (error) {
    console.error('Error processing PDF buffer:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body with error handling
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pdfUrl, bookId } = requestData || {};

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'PDF URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: 'Book ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Try to extract text and metadata from PDF
    let extractedText = '';
    let pageCount = 0;
    try {
      const extractionResult = await extractTextFromPDF(pdfUrl, supabaseClient);
      extractedText = extractionResult.text;
      pageCount = extractionResult.pageCount;
      console.log(`Extracted ${pageCount} pages, ${extractedText.length} characters`);
    } catch (error: any) {
      console.error('PDF extraction error:', error?.message || error);
      // Continue with empty text - will return manual processing suggestion
      // Try to at least get page count from structure if URL fetch failed
      if (pageCount === 0) {
        try {
          // Try direct fetch as fallback
          const fallbackResponse = await fetch(pdfUrl);
          if (fallbackResponse.ok) {
            const fallbackBuffer = await fallbackResponse.arrayBuffer();
            pageCount = extractPageCountFromPDFStructure(fallbackBuffer);
            console.log(`Fallback: Extracted ${pageCount} pages from structure`);
          }
        } catch (fallbackError) {
          console.warn('Fallback extraction also failed:', fallbackError);
        }
      }
    }

    let chapters: Chapter[] = [];
    
    if (extractedText && extractedText.length > 0) {
      // Extract chapters from text
      chapters = extractChaptersFromText(extractedText);
      console.log(`Extracted ${chapters.length} chapters`);
    }

    // Update book in database with extracted information
    // Even if chapters aren't extracted, we can still save page count
    const updateData: any = {
      extracted_chapters_data: {
        fullText: extractedText,
        extractedAt: new Date().toISOString(),
        pageCount: pageCount,
      },
    };

    // Only add page_count if we have a valid page count
    if (pageCount > 0) {
      updateData.page_count = pageCount;
    }

    // If chapters were extracted, add them
    if (chapters.length > 0) {
      updateData.chapters = JSON.stringify(chapters);
      updateData.total_chapters = chapters.length;
    }

    // Try to update the database
    try {
      const { error: updateError, data: updateResult } = await supabaseClient
        .from('books')
        .update(updateData)
        .eq('id', bookId)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        // Don't throw - we can still return the extracted data
        // The frontend can handle partial updates
      } else {
        console.log('Database updated successfully');
      }
    } catch (dbError: any) {
      console.error('Database update exception:', dbError);
      // Continue - we can still return extracted data
    }

    // Return results
    if (chapters.length > 0) {
      // Successfully extracted chapters
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            chapters,
            totalChapters: chapters.length,
            pageCount: pageCount,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (pageCount > 0) {
      // Extracted page count but no chapters
      return new Response(
        JSON.stringify({
          success: true,
          message: `PDF processed. Found ${pageCount} pages. Please enter chapters manually.`,
          data: {
            chapters: [],
            totalChapters: 0,
            pageCount: pageCount,
          },
          requiresManualEntry: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Could not extract anything
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not extract information from PDF. Please use manual entry.',
          requiresManualEntry: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    
    // Log full error details for debugging
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Error',
    };
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Check if we're in development mode
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development' || 
                         Deno.env.get('ENVIRONMENT') === 'development';
    
    // Return error response with proper status code
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Failed to process PDF',
        requiresManualEntry: true,
        details: isDevelopment ? errorDetails : undefined,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

