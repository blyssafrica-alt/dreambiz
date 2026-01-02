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

/**
 * Async PDF processing function (runs in background)
 * This function processes PDFs without blocking the HTTP response
 */
async function processPDFAsync(
  jobId: string,
  pdfUrl: string,
  bookId: string | null,
  supabaseClient: any
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`[Job ${jobId}] Starting PDF processing`);
    
    // Update job status to processing
    await supabaseClient
      .from('pdf_processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        progress: 10,
      })
      .eq('id', jobId);

    // Extract text and metadata from PDF
    let extractedText = '';
    let pageCount = 0;
    let pdfMetadata: any = null;
    
    try {
      // Update progress: fetching PDF
      await supabaseClient
        .from('pdf_processing_jobs')
        .update({ progress: 20 })
        .eq('id', jobId);

      const extractionResult = await extractTextFromPDF(pdfUrl, supabaseClient);
      extractedText = extractionResult.text;
      pageCount = extractionResult.pageCount;
      pdfMetadata = extractionResult.metadata;
      
      console.log(`[Job ${jobId}] Extracted ${pageCount} pages, ${extractedText.length} characters`);
      
      // Update progress: text extraction done
      await supabaseClient
        .from('pdf_processing_jobs')
        .update({ progress: 60 })
        .eq('id', jobId);
    } catch (error: any) {
      console.error(`[Job ${jobId}] PDF extraction error:`, error?.message || error);
      // Try to get at least page count
      if (pageCount === 0) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          try {
            const fallbackResponse = await fetch(pdfUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (fallbackResponse.ok) {
              const fallbackBuffer = await fallbackResponse.arrayBuffer();
              pageCount = extractPageCountFromPDFStructure(fallbackBuffer);
              console.log(`[Job ${jobId}] Fallback: Extracted ${pageCount} pages from structure`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            // Continue with pageCount = 0
          }
        } catch (fallbackError: any) {
          // Continue with pageCount = 0
        }
      }
    }

    // Extract chapters from text
    let chapters: Chapter[] = [];
    
    // Update progress: extracting chapters
    await supabaseClient
      .from('pdf_processing_jobs')
      .update({ progress: 70 })
      .eq('id', jobId);
    
    if (extractedText && extractedText.length > 0) {
      chapters = extractChaptersFromText(extractedText);
      console.log(`[Job ${jobId}] Extracted ${chapters.length} chapters`);
    }

    // Update progress: processing complete
    await supabaseClient
      .from('pdf_processing_jobs')
      .update({ progress: 90 })
      .eq('id', jobId);

    // Prepare result data
    const resultData = {
      chapters,
      totalChapters: chapters.length,
      pageCount: pageCount,
      metadata: pdfMetadata || null,
      fullTextLength: extractedText.length,
      requiresManualEntry: chapters.length === 0 && pageCount > 0,
    };

    // Update book in database if bookId provided
    if (bookId) {
      try {
        const updateData: any = {
          extracted_chapters_data: {
            fullText: extractedText,
            extractedAt: new Date().toISOString(),
            pageCount: pageCount,
            metadata: pdfMetadata || null,
          },
        };

        if (pageCount > 0) {
          updateData.page_count = pageCount;
        }

        if (chapters.length > 0) {
          updateData.chapters = JSON.stringify(chapters);
          updateData.total_chapters = chapters.length;
        }

        const { error: updateError } = await supabaseClient
          .from('books')
          .update(updateData)
          .eq('id', bookId);

        if (updateError) {
          console.error(`[Job ${jobId}] Database update error:`, updateError);
        } else {
          console.log(`[Job ${jobId}] Database updated successfully`);
        }
      } catch (dbError: any) {
        console.error(`[Job ${jobId}] Database update exception:`, dbError);
      }
    }

    // Mark job as completed
    await supabaseClient
      .from('pdf_processing_jobs')
      .update({
        status: 'completed',
        progress: 100,
        result_data: resultData,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    const duration = Date.now() - startTime;
    console.log(`[Job ${jobId}] ✅ Completed in ${duration}ms`);
  } catch (error: any) {
    console.error(`[Job ${jobId}] ❌ Processing failed:`, error);
    
    // Mark job as failed
    await supabaseClient
      .from('pdf_processing_jobs')
      .update({
        status: 'failed',
        error_message: error?.message || 'Unknown error during processing',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    
    throw error; // Re-throw for outer error handler
  }
}

serve(async (req) => {
  // Log ALL requests for debugging (including OPTIONS)
  // Extract full URL information
  const url = new URL(req.url);
  
  // Get forwarded headers (gateway sets these)
  const forwardedProto = req.headers.get('x-forwarded-proto') || req.headers.get('X-Forwarded-Proto');
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('X-Forwarded-Host');
  const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('X-Forwarded-For');
  
  // NOTE: Supabase gateway STRIPS /functions/v1/ prefix before forwarding to function
  // So the function receives /process-pdf instead of /functions/v1/process-pdf
  // This is EXPECTED and NORMAL behavior - the frontend MUST include /functions/v1/ but the function receives it without
  const expectedPaths = ['/process-pdf']; // Gateway always strips /functions/v1/, so we only receive /process-pdf
  const isCorrectPath = url.pathname === '/process-pdf' || url.pathname === '/functions/v1/process-pdf';
  
  console.log('=== Edge Function Request ===');
  console.log('Method:', req.method);
  console.log('Raw req.url:', req.url);
  console.log('URL pathname (after gateway):', url.pathname);
  console.log('X-Forwarded-Proto:', forwardedProto || '(not set)');
  console.log('X-Forwarded-Host:', forwardedHost || '(not set)');
  console.log('✅ Path is correct (gateway strips /functions/v1/):', isCorrectPath);
  console.log('ℹ️ NOTE: Gateway strips /functions/v1/ prefix - frontend MUST send it but function receives without it');
  
  // Only log warnings for actual issues (wrong path, not the protocol since req.url might be misleading)
  if (!isCorrectPath) {
    console.warn('⚠️ WARNING: Unexpected path:', url.pathname, '- Expected: /process-pdf (gateway should strip /functions/v1/)');
  }
  
  // Log headers (excluding sensitive values)
  const headerMap: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    // Don't log full auth tokens
    if (key.toLowerCase() === 'authorization') {
      headerMap[key] = value.substring(0, 20) + '...';
    } else if (key.toLowerCase() === 'apikey') {
      headerMap[key] = value.substring(0, 20) + '...';
    } else {
      headerMap[key] = value;
    }
  });
  console.log('Request headers (sanitized):', JSON.stringify(headerMap, null, 2));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST method - but return 200 to prevent FunctionsHttpError
  if (req.method !== 'POST') {
    console.error('❌ Invalid method:', req.method, '- Only POST is allowed');
    console.error('❌ Request URL:', req.url);
    console.error('❌ Request pathname:', url.pathname);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Method ${req.method} not allowed. Only POST is supported.`,
        requiresManualEntry: true,
        receivedMethod: req.method,
      }),
      { 
        status: 200,  // Changed from 405 to 200 to prevent FunctionsHttpError
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  console.log('✅ Valid POST request received');

  try {
    // Get headers - function works with or without authentication
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const apikeyHeader = req.headers.get('apikey') || req.headers.get('Apikey') || req.headers.get('APIKEY');
    
    // Log for debugging
    console.log('Process PDF request received:', {
      method: req.method,
      hasAuth: !!authHeader,
      hasApikey: !!apikeyHeader,
      url: req.url,
      authHeaderPreview: authHeader ? authHeader.substring(0, 30) + '...' : null,
      apikeyHeaderPreview: apikeyHeader ? apikeyHeader.substring(0, 20) + '...' : null,
    });
    
    // ============================================
    // AUTHENTICATION HANDLING - CRITICAL
    // ============================================
    // The Supabase gateway validates JWT tokens BEFORE forwarding to this function.
    // 
    // GATEWAY BEHAVIOR:
    // - If Authorization header is MISSING → Gateway may reject (depending on function config)
    // - If Authorization header is INVALID/EXPIRED → Gateway returns 401 (function NEVER runs)
    // - If Authorization header is VALID → Gateway forwards to function (this code runs)
    // - If no Authorization header → Gateway may allow (if function allows public access)
    //
    // IF WE REACH HERE, IT MEANS:
    // 1. The apikey header was present and valid (always required by gateway)
    // 2. Either:
    //    - No Authorization header was sent (function allows public access), OR
    //    - Authorization header was sent AND JWT was VALID (gateway validated it)
    //
    // THIS FUNCTION:
    // - Works with OR without authentication
    // - Uses service role key when available (bypasses RLS completely)
    // - NEVER returns 401 - gateway handles all auth validation
    // - If auth header exists, gateway has already validated it
    // ============================================
    
    if (!authHeader) {
      console.log('⚠️ No Authorization header - function allowing public access');
    } else {
      console.log('✅ Authorization header present - gateway has validated JWT');
    }

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

    const { pdfUrl, bookId, jobId: requestJobId } = requestData || {};

    if (!pdfUrl && !requestJobId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PDF URL or jobId is required',
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Initialize Supabase client (moved before job status check)
    let supabaseClient;
    let userId: string | null = null;
    
    if (supabaseServiceKey) {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Using service role key - RLS bypassed');
      
      if (authHeader) {
        try {
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();
          if (token) {
            const userVerificationClient = createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: authHeader,
                  apikey: supabaseAnonKey,
                },
              },
            });
            
            const { data: { user }, error: userError } = await userVerificationClient.auth.getUser();
            if (!userError && user) {
              userId = user.id;
              console.log('User authenticated (for logging):', userId);
            }
          }
        } catch (verifyError: any) {
          // Not an error - function works without user context
        }
      }
    } else {
      if (authHeader) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: authHeader,
              apikey: supabaseAnonKey,
            },
          },
        });
        
        try {
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
          if (!userError && user) {
            userId = user.id;
            console.log('User authenticated:', userId);
          }
        } catch (getUserError: any) {
          // Not critical
        }
      } else {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        console.log('No auth header - using anon key (public access)');
      }
    }

    // ============================================
    // JOB-BASED ASYNC PROCESSING PATTERN
    // ============================================
    // To prevent timeout (heartbeat ~60s), we use a job queue:
    // 1. Create job record immediately (< 1s)
    // 2. Return job ID to frontend (< 2s)
    // 3. Process PDF asynchronously (fire and forget)
    // 4. Update job status as processing progresses
    // 5. Frontend polls job status
    // ============================================
    
    // If jobId provided, this is a status check or retry
    if (requestJobId) {
      const { data: job, error: jobError } = await supabaseClient
        .from('pdf_processing_jobs')
        .select('*')
        .eq('id', requestJobId)
        .single();
      
      if (jobError || !job) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Job not found',
            jobId: requestJobId,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Return job status
      return new Response(
        JSON.stringify({
          success: true,
          job: {
            id: job.id,
            status: job.status,
            progress: job.progress || 0,
            error: job.error_message,
            result: job.result_data,
            startedAt: job.started_at,
            completedAt: job.completed_at,
          },
          jobId: requestJobId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // ============================================
    // CREATE JOB RECORD (FAST - < 1 second)
    // ============================================
    const { data: newJob, error: jobCreateError } = await supabaseClient
      .from('pdf_processing_jobs')
      .insert({
        pdf_url: pdfUrl!,
        book_id: bookId || null,
        user_id: userId,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single();

    if (jobCreateError || !newJob) {
      console.error('Failed to create job:', jobCreateError);
      
      // Check if error is due to missing table
      const isTableMissing = jobCreateError?.code === '42P01' || 
                            jobCreateError?.message?.includes('does not exist') ||
                            jobCreateError?.message?.includes('relation') && jobCreateError?.message?.includes('does not exist');
      
      if (isTableMissing) {
        console.error('CRITICAL: pdf_processing_jobs table does not exist. Please run the SQL migration.');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Database table not found. Please run the SQL migration to create pdf_processing_jobs table.',
            requiresManualEntry: true,
            deploymentIssue: true,
            fixInstructions: '1. Go to Supabase Dashboard → SQL Editor\n2. Run the contents of database/create_pdf_processing_jobs.sql\n3. Verify table is created\n4. Try again',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if error is due to RLS/permission issue
      const isPermissionError = jobCreateError?.code === '42501' || 
                                jobCreateError?.message?.includes('permission denied') ||
                                jobCreateError?.code === 'PGRST301';
      
      if (isPermissionError) {
        console.error('CRITICAL: Permission error. Check RLS policies or service role key.');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Permission denied. Please check Edge Function environment variables (SUPABASE_SERVICE_ROLE_KEY) and RLS policies.',
            requiresManualEntry: true,
            deploymentIssue: true,
            fixInstructions: '1. Check SUPABASE_SERVICE_ROLE_KEY is set in Edge Function env vars\n2. Verify RLS policies in database/create_pdf_processing_jobs.sql are created\n3. Try again',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generic error fallback
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create processing job: ${jobCreateError?.message || 'Unknown error'}. Please try again or use manual entry.`,
          requiresManualEntry: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createdJobId = newJob.id;
    console.log(`Job created: ${createdJobId}`);

    // ============================================
    // RETURN JOB ID IMMEDIATELY (< 2 seconds total)
    // Frontend will poll for status
    // ============================================
    
    // Start async processing (fire and forget - don't await)
    // This allows the function to return quickly while processing continues
    processPDFAsync(createdJobId, pdfUrl!, bookId, supabaseClient).catch((error: any) => {
      console.error(`[Job ${createdJobId}] Async processing error:`, error);
      // Update job status to failed
      supabaseClient
        .from('pdf_processing_jobs')
        .update({
          status: 'failed',
          error_message: error?.message || 'Processing failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', createdJobId)
        .then(() => {
          console.log(`[Job ${createdJobId}] Marked as failed`);
        })
        .catch((updateError: any) => {
          console.error(`[Job ${createdJobId}] Failed to update job status:`, updateError);
        });
    });

    // Return immediately with job ID
    return new Response(
      JSON.stringify({
        success: true,
        jobId: createdJobId,
        status: 'pending',
        message: 'PDF processing started. Poll job status to get results.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // ============================================
    // COMPREHENSIVE ERROR HANDLING
    // ============================================
    // This catch block handles ALL errors that occur during PDF processing.
    // It ALWAYS returns a valid JSON Response with status 200 to prevent
    // the Supabase client from throwing FunctionsHttpError.
    // ============================================
    
    console.error('[process-pdf] Error processing PDF:', error);
    
    // Safely extract error information
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    const errorName = error?.name || 'Error';
    
    // Log full error details for debugging (only in development)
    const isDevelopment = Deno.env.get('DENO_ENV') === 'development' || 
                         Deno.env.get('ENVIRONMENT') === 'development';
    
    if (isDevelopment) {
      const errorDetails = {
        message: errorMessage,
        stack: errorStack,
        name: errorName,
      };
      console.error('[process-pdf] Error details:', JSON.stringify(errorDetails, null, 2));
    }
    
    // ALWAYS return 200 status code with structured JSON
    // This prevents the Supabase client from throwing FunctionsHttpError
    // The frontend checks the 'success' field to determine actual outcome
    try {
      const errorResponse = {
        success: false,
        error: errorMessage,
        message: 'An error occurred while processing the PDF. Please use manual entry.',
        data: {
          chapters: [],
          totalChapters: 0,
          pageCount: 0,
          metadata: null,
          fullTextLength: 0,
        },
        requiresManualEntry: true,
        ...(isDevelopment ? { details: { message: errorMessage, stack: errorStack, name: errorName } } : {}),
      };
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 200,  // Always 200 to prevent FunctionsHttpError
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
          } 
        }
      );
    } catch (jsonError: any) {
      // If JSON.stringify fails (should never happen), return minimal response
      console.error('[process-pdf] CRITICAL: Failed to stringify error response:', jsonError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Internal server error',
          message: 'An error occurred while processing the PDF. Please use manual entry.',
          requiresManualEntry: true,
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
          } 
        }
      );
    }
  }
});

