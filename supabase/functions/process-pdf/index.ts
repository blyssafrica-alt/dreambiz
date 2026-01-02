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
 * Extract text from PDF using PDF.js
 * Note: This is a simplified version. For production, you may want to use
 * a more robust PDF processing library or service.
 */
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // For Deno, we'll use a simple approach
    // In production, you might want to use:
    // - pdf.js (via npm:jsr or similar)
    // - External API (Google Document AI, AWS Textract, etc.)
    // - Native Deno PDF library
    
    // For now, return empty string - this will trigger manual entry
    // TODO: Integrate actual PDF parsing library
    console.log('PDF fetched, size:', arrayBuffer.byteLength);
    
    // Placeholder: Return empty to indicate manual processing needed
    // In production, replace this with actual PDF text extraction
    return '';
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pdfUrl, bookId } = await req.json();

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

    // Try to extract text from PDF
    let extractedText = '';
    try {
      extractedText = await extractTextFromPDF(pdfUrl);
    } catch (error) {
      console.error('PDF extraction error:', error);
      // Continue with empty text - will return manual processing suggestion
    }

    let chapters: Chapter[] = [];
    
    if (extractedText && extractedText.length > 0) {
      // Extract chapters from text
      chapters = extractChaptersFromText(extractedText);
    }

    // If no chapters extracted, return suggestion for manual entry
    if (chapters.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Automatic chapter extraction not available. Please use manual entry.',
          requiresManualEntry: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update book in database with extracted chapters
    const { error: updateError } = await supabaseClient
      .from('books')
      .update({
        chapters: JSON.stringify(chapters),
        total_chapters: chapters.length,
        extracted_chapters_data: {
          fullText: extractedText,
          extractedAt: new Date().toISOString(),
        },
      })
      .eq('id', bookId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          chapters,
          totalChapters: chapters.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process PDF',
        requiresManualEntry: true,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

