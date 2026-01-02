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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  metadata?: {
    title?: string | null;
    author?: string | null;
    subject?: string | null;
    creator?: string | null;
    producer?: string | null;
    creationDate?: string | null;
    modificationDate?: string | null;
  };
}

/**
 * Extract chapters from PDF text using pattern matching
 * Enhanced with more patterns and better detection
 */
function extractChaptersFromText(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  
  if (!text || text.trim().length === 0) {
    return chapters;
  }

  // Enhanced chapter patterns - more comprehensive matching
  const chapterPatterns = [
    // Standard chapter formats
    /^Chapter\s+(\d+)[:.\s\-]+(.+)$/gmi,
    /^CHAPTER\s+(\d+)[:.\s\-]+(.+)$/gmi,
    /^Ch\.\s*(\d+)[:.\s\-]+(.+)$/gmi,
    /^CH\.\s*(\d+)[:.\s\-]+(.+)$/gmi,
    
    // Numbered chapters
    /^(\d+)[:.\s\-]+(.+)$/gmi,
    /^(\d+)\.\s+(.+)$/gmi,
    /^(\d+)\s+([A-Z][^\n]+)$/gmi,
    
    // Part/Section formats
    /^Part\s+(\d+)[:.\s\-]+(.+)$/gmi,
    /^PART\s+(\d+)[:.\s\-]+(.+)$/gmi,
    /^Section\s+(\d+)[:.\s\-]+(.+)$/gmi,
    /^SECTION\s+(\d+)[:.\s\-]+(.+)$/gmi,
    
    // Roman numerals
    /^Chapter\s+([IVX]+)[:.\s\-]+(.+)$/gmi,
    /^CHAPTER\s+([IVX]+)[:.\s\-]+(.+)$/gmi,
    
    // With "of" (e.g., "Chapter 1 of 10")
    /^Chapter\s+(\d+)\s+of\s+\d+[:.\s\-]+(.+)$/gmi,
    
    // Standalone chapter titles (if on their own line)
    /^Chapter\s+(\d+)$/gmi,
  ];

  const lines = text.split('\n');
  let currentChapter: Chapter | null = null;
  let chapterContent: string[] = [];
  let pageNumber = 1; // Track page numbers for chapter location

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line indicates a new page
    if (line.match(/^---\s*Page\s+(\d+)\s+---$/i)) {
      const pageMatch = line.match(/(\d+)/);
      if (pageMatch) {
        pageNumber = parseInt(pageMatch[1], 10);
      }
      continue; // Skip page markers
    }
    
    // Try to match chapter patterns
    let matched = false;
    let chapterNum: number | null = null;
    let chapterTitle: string = '';
    
    for (const pattern of chapterPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) {
        // Handle different match formats
        if (match[1] && match[2]) {
          // Standard format: number and title
          const numStr = match[1];
          // Try to parse as number, or convert Roman numeral
          if (/^\d+$/.test(numStr)) {
            chapterNum = parseInt(numStr, 10);
          } else if (/^[IVX]+$/i.test(numStr)) {
            // Simple Roman numeral conversion (I=1, II=2, III=3, IV=4, V=5, etc.)
            const romanMap: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
            let romanValue = 0;
            for (let j = 0; j < numStr.length; j++) {
              const current = romanMap[numStr[j].toUpperCase()] || 0;
              const next = romanMap[numStr[j + 1]?.toUpperCase()] || 0;
              if (current < next) {
                romanValue -= current;
              } else {
                romanValue += current;
              }
            }
            chapterNum = romanValue;
          } else {
            chapterNum = parseInt(numStr, 10) || chapters.length + 1;
          }
          chapterTitle = match[2].trim() || `Chapter ${chapterNum}`;
        } else if (match[1]) {
          // Just number, no title
          chapterNum = parseInt(match[1], 10) || chapters.length + 1;
          chapterTitle = `Chapter ${chapterNum}`;
        }
        
        if (chapterNum !== null) {
          // Save previous chapter if exists
          if (currentChapter) {
            currentChapter.content = chapterContent.join('\n').trim();
            currentChapter.pageEnd = pageNumber - 1;
            chapters.push(currentChapter);
          }
          
          // Start new chapter
          currentChapter = {
            number: chapterNum,
            title: chapterTitle,
            content: '',
            pageStart: pageNumber,
          };
          chapterContent = [];
          matched = true;
          break;
        }
      }
    }
    
    if (!matched && currentChapter) {
      // Add line to current chapter content (skip empty lines and page markers)
      if (line.length > 0 && !line.match(/^---\s*Page\s+\d+\s+---$/i)) {
        chapterContent.push(line);
      }
    }
  }
  
  // Add last chapter
  if (currentChapter) {
    currentChapter.content = chapterContent.join('\n').trim();
    currentChapter.pageEnd = pageNumber;
    chapters.push(currentChapter);
  }
  
  // Sort chapters by number to ensure correct order
  chapters.sort((a, b) => a.number - b.number);
  
  // Remove duplicate chapters (same number)
  const uniqueChapters: Chapter[] = [];
  const seenNumbers = new Set<number>();
  for (const chapter of chapters) {
    if (!seenNumbers.has(chapter.number)) {
      seenNumbers.add(chapter.number);
      uniqueChapters.push(chapter);
    }
  }

  return uniqueChapters;
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
async function extractTextFromPDF(pdfUrl: string, supabaseClient?: any): Promise<{ text: string; pageCount: number; metadata?: any }> {
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
    
    // Regular fetch for public URLs with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      response = await fetch(pdfUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'DreamBig-PDF-Processor/1.0',
        },
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText} (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await processPDFBuffer(arrayBuffer);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('PDF fetch timeout - URL may be unreachable or too slow');
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error extracting PDF:', error?.message || error);
    // Don't throw - let the caller handle it gracefully
    throw error;
  }
}

/**
 * Process PDF buffer to extract text and page count
 */
async function processPDFBuffer(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number; metadata?: any }> {
  try {
    console.log('PDF fetched, size:', arrayBuffer.byteLength);
    
    // First, extract page count from PDF structure (always works)
    const pageCount = extractPageCountFromPDFStructure(arrayBuffer);
    
    // Try to extract text using PDF.js (optional, may not work in all Deno environments)
    try {
      // Import PDF.js from CDN (works in Deno)
      // Wrap in try-catch to handle import failures gracefully
      let pdfjsLib;
      try {
        // @ts-ignore - PDF.js from CDN
        pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
      } catch (importError) {
        console.warn('Failed to import PDF.js:', importError);
        // Return with page count only
        return {
          text: '',
          pageCount: pageCount,
          metadata: undefined,
        };
      }
      
      if (!pdfjsLib || !pdfjsLib.getDocument) {
        console.warn('PDF.js library not loaded correctly');
        return {
          text: '',
          pageCount: pageCount,
          metadata: undefined,
        };
      }
      
      // Load the PDF document with timeout protection
      let pdf;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        pdf = await Promise.race([
          loadingTask.promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF loading timeout')), 30000)
          )
        ]) as any;
      } catch (loadError) {
        console.warn('Failed to load PDF with PDF.js:', loadError);
        return {
          text: '',
          pageCount: pageCount,
          metadata: undefined,
        };
      }
      
      if (!pdf || !pdf.numPages) {
        console.warn('PDF document loaded but no pages found');
        return {
          text: '',
          pageCount: pageCount,
          metadata: undefined,
        };
      }
      
      const verifiedPageCount = pdf.numPages;
      console.log(`PDF.js verified: ${verifiedPageCount} pages`);
      
      // Extract text from ALL pages (removed 50 page limit for complete extraction)
      let fullText = '';
      
      // Extract metadata if available
      let pdfMetadata: any = {};
      try {
        const metadata = await pdf.getMetadata();
        if (metadata) {
          pdfMetadata = {
            title: metadata.info?.Title || null,
            author: metadata.info?.Author || null,
            subject: metadata.info?.Subject || null,
            creator: metadata.info?.Creator || null,
            producer: metadata.info?.Producer || null,
            creationDate: metadata.info?.CreationDate || null,
            modificationDate: metadata.info?.ModDate || null,
          };
          console.log('PDF Metadata extracted:', pdfMetadata);
        }
      } catch (metadataError) {
        console.warn('Could not extract PDF metadata:', metadataError);
      }
      
      // Process all pages - extract text with better formatting
      for (let pageNum = 1; pageNum <= verifiedPageCount; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Combine all text items from the page with better formatting
          if (textContent && textContent.items) {
            let pageText = '';
            let lastY = -1;
            
            // Group text items by Y position to preserve line breaks
            const lines: { y: number; items: any[] }[] = [];
            
            for (const item of textContent.items) {
              const y = item.transform?.[5] || 0; // Y position from transform matrix
              
              // Find or create line for this Y position
              let line = lines.find(l => Math.abs(l.y - y) < 5); // 5px tolerance
              if (!line) {
                line = { y, items: [] };
                lines.push(line);
              }
              line.items.push(item);
            }
            
            // Sort lines by Y position (top to bottom)
            lines.sort((a, b) => b.y - a.y);
            
            // Build page text from lines
            for (const line of lines) {
              // Sort items in line by X position (left to right)
              line.items.sort((a, b) => {
                const ax = a.transform?.[4] || 0;
                const bx = b.transform?.[4] || 0;
                return ax - bx;
              });
              
              const lineText = line.items
                .map((item: any) => item.str || '')
                .filter((str: string) => str.length > 0)
                .join(' ');
              
              if (lineText.trim().length > 0) {
                pageText += lineText + '\n';
              }
            }
            
            if (pageText.trim().length > 0) {
              fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
            }
          }
        } catch (pageError) {
          console.warn(`Error extracting page ${pageNum}:`, pageError);
          // Continue with next page
        }
      }
      
      console.log(`Extracted ${fullText.length} characters from ${verifiedPageCount} pages`);
      
      // Store metadata in the result
      if (Object.keys(pdfMetadata).length > 0) {
        fullText = `[PDF Metadata]\nTitle: ${pdfMetadata.title || 'N/A'}\nAuthor: ${pdfMetadata.author || 'N/A'}\nSubject: ${pdfMetadata.subject || 'N/A'}\n\n${fullText}`;
      }
      
      return {
        text: fullText,
        pageCount: verifiedPageCount,
        metadata: Object.keys(pdfMetadata).length > 0 ? pdfMetadata : undefined,
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
    // Get authorization header - Edge Functions can be called with or without auth
    // Function works with or without authentication
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey') || req.headers.get('Apikey') || req.headers.get('APIKEY');
    
    // Log all headers for debugging (remove in production)
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = value.substring(0, 20) + (value.length > 20 ? '...' : '');
    });
    
    // Log for debugging (remove sensitive data in production)
    console.log('Process PDF request received:', {
      method: req.method,
      hasAuth: !!authHeader,
      hasApikey: !!apikeyHeader,
      url: req.url,
      headerNames: Array.from(req.headers.keys()),
      apikeyHeaderValue: apikeyHeader ? apikeyHeader.substring(0, 20) + '...' : null,
      allHeadersPreview: allHeaders,
    });
    
    // IMPORTANT: If we reach here, the Supabase gateway accepted the request
    // This means the apikey header was present and valid
    // The 401 error happens at the gateway level BEFORE this code runs
    // So if this code executes, authentication passed the gateway check

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request JSON:', jsonError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pdfUrl, bookId } = requestData || {};

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PDF URL is required',
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // bookId is optional - can process PDF for new books before saving
    // If bookId is provided, we'll update the database; otherwise just return extracted data

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? apikeyHeader ?? '';

    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase URL not configured',
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key if available (bypasses RLS), otherwise use anon key
    // Function works with or without authentication
    const supabaseClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: authHeader ? {
              Authorization: authHeader,
              apikey: supabaseAnonKey,
            } : {},
          },
        });
    
    // Try to verify user if auth header exists (optional)
    let userId: string | null = null;
    if (authHeader && supabaseAnonKey) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (token) {
          const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
              headers: {
                Authorization: authHeader,
                apikey: supabaseAnonKey,
              },
            },
          });
          const { data: { user }, error: userError } = await userClient.auth.getUser();
          if (!userError && user) {
            userId = user.id;
            console.log('User authenticated:', userId);
          } else {
            console.warn('JWT verification failed (continuing without auth):', userError?.message);
          }
        }
      } catch (authError: any) {
        console.warn('Error verifying authentication (continuing without auth):', authError?.message);
      }
    }

    // Try to extract text and metadata from PDF
    let extractedText = '';
    let pageCount = 0;
    let pdfMetadata: any = null;
    try {
      const extractionResult = await extractTextFromPDF(pdfUrl, supabaseClient);
      extractedText = extractionResult.text;
      pageCount = extractionResult.pageCount;
      pdfMetadata = extractionResult.metadata;
      console.log(`Extracted ${pageCount} pages, ${extractedText.length} characters`);
      if (pdfMetadata) {
        console.log('PDF Metadata:', pdfMetadata);
      }
    } catch (error: any) {
      console.error('PDF extraction error:', error?.message || error);
      // Continue with empty text - will return manual processing suggestion
      // Try to at least get page count from structure if URL fetch failed
      if (pageCount === 0) {
        try {
          // Try direct fetch as fallback with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for fallback
          
          try {
            const fallbackResponse = await fetch(pdfUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (fallbackResponse.ok) {
              const fallbackBuffer = await fallbackResponse.arrayBuffer();
              pageCount = extractPageCountFromPDFStructure(fallbackBuffer);
              console.log(`Fallback: Extracted ${pageCount} pages from structure`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name !== 'AbortError') {
              console.warn('Fallback fetch failed:', fetchError?.message || fetchError);
            }
          }
        } catch (fallbackError: any) {
          console.warn('Fallback extraction also failed:', fallbackError?.message || fallbackError);
          // Continue with pageCount = 0
        }
      }
    }

    let chapters: Chapter[] = [];
    
    if (extractedText && extractedText.length > 0) {
      // Extract chapters from text
      chapters = extractChaptersFromText(extractedText);
      console.log(`Extracted ${chapters.length} chapters`);
    }

    // Update book in database with extracted information (only if bookId is provided)
    // Even if chapters aren't extracted, we can still save page count
    if (bookId) {
      const updateData: any = {
        extracted_chapters_data: {
          fullText: extractedText,
          extractedAt: new Date().toISOString(),
          pageCount: pageCount,
          metadata: pdfMetadata || null,
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
    } else {
      console.log('No bookId provided - returning extracted data without database update');
    }

    // Return results - ALWAYS return 200 status code, use success field for status
    if (chapters.length > 0) {
      // Successfully extracted chapters
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            chapters,
            totalChapters: chapters.length,
            pageCount: pageCount,
            metadata: pdfMetadata || null,
            fullTextLength: extractedText.length,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (pageCount > 0) {
      // Extracted page count but no chapters
      return new Response(
        JSON.stringify({
          success: true,
          message: `PDF processed. Found ${pageCount} pages${extractedText.length > 0 ? ` with ${extractedText.length} characters of text` : ''}. Please enter chapters manually.`,
          data: {
            chapters: [],
            totalChapters: 0,
            pageCount: pageCount,
            metadata: pdfMetadata || null,
            fullTextLength: extractedText.length,
          },
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Could not extract anything - still return 200 with success: false
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not extract information from PDF. Please use manual entry.',
          data: {
            chapters: [],
            totalChapters: 0,
            pageCount: 0,
            metadata: null,
            fullTextLength: 0,
          },
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    // ALWAYS return 200 status code - use success field to indicate failure
    // This prevents FunctionsHttpError from being thrown
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Failed to process PDF',
        message: 'An error occurred while processing the PDF. Please use manual entry.',
        data: {
          chapters: [],
          totalChapters: 0,
          pageCount: 0,
        },
        requiresManualEntry: true,
        details: isDevelopment ? errorDetails : undefined,
      }),
      { 
        status: 200,  // Changed from 500 to 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

