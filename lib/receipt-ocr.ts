/**
 * Receipt OCR and Text Parsing Utility
 * Extracts structured data from receipt images using OCR
 */

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

export interface ReceiptData {
  merchant?: string;
  address?: string;
  amount?: number;
  date?: string;
  items?: string[];
  tax?: number;
  subtotal?: number;
  category?: string;
}

/**
 * Convert image URI to base64 string
 * Uses fetch + blob approach for better React Native compatibility
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    console.log('Converting image to base64, URI:', uri.substring(0, 50) + '...');
    
    // For React Native, use fetch + blob approach which is more reliable
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Convert blob to base64
    const blob = await response.blob();
    
    // Use FileReader for base64 conversion (works in React Native)
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          console.log('Image converted to base64 successfully, length:', base64.length);
          resolve(base64);
        } catch (error) {
          reject(new Error('Failed to extract base64 from FileReader result'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('FileReader failed to read blob'));
      };
      
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error('Error converting image to base64:', error);
    
    // Try fallback method using FileSystem if fetch fails
    try {
      console.log('Trying FileSystem fallback method...');
      // Use string literal 'base64' as encoding type
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
      console.log('FileSystem fallback succeeded');
      return base64;
    } catch (fallbackError: any) {
      console.error('FileSystem fallback also failed:', fallbackError);
      throw new Error(`Failed to convert image to base64: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Extract text from image using OCR.space API
 * Free tier: 25,000 requests/month
 * Get API key from: https://ocr.space/ocrapi/freekey
 */
async function extractTextWithOCRSpace(imageUri: string, apiKey?: string): Promise<string> {
  try {
    // Convert image to base64
    const base64Image = await imageUriToBase64(imageUri);
    
    // Don't use demo key - require a real API key
    if (!apiKey || apiKey === 'helloworld') {
      throw new Error(
        'OCR.space API key not configured. Please get a free API key from https://ocr.space/ocrapi/freekey and add it to .env as EXPO_PUBLIC_OCR_SPACE_API_KEY'
      );
    }
    
    const ocrApiUrl = 'https://api.ocr.space/parse/image';
    
    // OCR.space API accepts base64 images via FormData
    // For React Native, we need to use the correct format
    const formData = new FormData();
    
    // Append base64 image with proper format
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}` as any);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is better for receipts
    
    // Add API key
    formData.append('apikey', apiKey);
    
    console.log('Sending OCR request to OCR.space API...');
    
    const response = await fetch(ocrApiUrl, {
      method: 'POST',
      body: formData as any,
    });
    
    console.log('OCR API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error response:', errorText);
      throw new Error(`OCR API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json() as any;
    console.log('OCR API response data:', JSON.stringify(data).substring(0, 500));
    
    // Check for API errors
    if (data && typeof data === 'object' && 'ErrorMessage' in data && data.ErrorMessage && Array.isArray(data.ErrorMessage) && data.ErrorMessage.length > 0) {
      const errorMsg = data.ErrorMessage.map((e: any) => String(e)).join(', ');
      throw new Error(`OCR API error: ${errorMsg}`);
    } else if (data && typeof data === 'object' && 'ErrorMessage' in data && data.ErrorMessage) {
      throw new Error(`OCR API error: ${String(data.ErrorMessage)}`);
    }
    
    // Check for rate limit or quota errors
    if (data && typeof data === 'object' && 'OCRExitCode' in data && data.OCRExitCode === 99) {
      throw new Error('OCR API quota exceeded. Please get a free API key from https://ocr.space/ocrapi/freekey');
    }
    
    if (data && typeof data === 'object' && 'OCRExitCode' in data && data.OCRExitCode === 1 && 'ParsedResults' in data && Array.isArray(data.ParsedResults) && data.ParsedResults.length > 0) {
      // Success - extract text from all parsed results
      const allText = data.ParsedResults
        .map((result: any) => (result && typeof result === 'object' && 'ParsedText' in result) ? String(result.ParsedText || '') : '')
        .join('\n')
        .trim();
      
      if (allText) {
        console.log('OCR text extracted successfully, length:', allText.length);
        return allText;
      }
    }
    
    // Check exit codes
    const exitCode = (data && typeof data === 'object' && 'OCRExitCode' in data) ? data.OCRExitCode : 0;
    if (exitCode === 2) {
      throw new Error('OCR processing failed - image may be corrupted');
    }
    if (exitCode === 3 || exitCode === 4) {
      throw new Error('OCR processing failed - no text detected in image');
    }
    
    throw new Error(`No text found in image. Exit code: ${exitCode}`);
  } catch (error: any) {
    console.error('OCR.space API error:', error);
    // Provide more helpful error messages
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('OCR API quota exceeded. Please get a free API key from https://ocr.space/ocrapi/freekey or wait a few minutes.');
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error: Please check your internet connection and try again.');
    }
    throw error;
  }
}

/**
 * Extract text from image using Tesseract.js (client-side OCR)
 * Fallback option - works offline, no API key needed
 * NOTE: Tesseract.js has limited support in React Native/Expo environments
 * It works best in web environments. For React Native, OCR.space API is recommended.
 */
async function extractTextWithTesseract(imageUri: string): Promise<string> {
  try {
    console.log('Attempting Tesseract.js OCR...');
    
    // Check if we're in React Native environment
    const isReactNative = typeof (globalThis as any).navigator !== 'undefined' && (globalThis as any).navigator.product === 'ReactNative';
    const isExpo = typeof (global as any).__expo !== 'undefined';
    
    if (isReactNative || isExpo) {
      console.warn('⚠️ Tesseract.js has limited support in React Native/Expo. Converting image to base64...');
    }
    
    // Convert image to base64 for better compatibility
    // Tesseract.js works better with base64 data URIs than file:// URIs
    let imageData: string;
    try {
      const base64Image = await imageUriToBase64(imageUri);
      // Create data URI for Tesseract
      imageData = `data:image/jpeg;base64,${base64Image}`;
      console.log('Image converted to base64, size:', base64Image.length, 'chars');
    } catch (base64Error: any) {
      console.warn('Failed to convert image to base64, trying direct URI:', base64Error.message);
      // Fallback to direct URI (may not work in React Native)
      imageData = imageUri;
    }
    
    // Dynamic import to avoid loading Tesseract if not installed
    const TesseractModule = await import('tesseract.js');
    // Handle both default and named exports
    const Tesseract = (TesseractModule as any).default || TesseractModule;
    const { createWorker } = Tesseract;
    
    if (!createWorker || typeof createWorker !== 'function') {
      throw new Error('Tesseract createWorker function not available');
    }
    
    console.log('Creating Tesseract worker...');
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        // Log progress for debugging
        if (m.status === 'recognizing text') {
          console.log(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    // Set page segmentation mode for receipts (PSM 6 = uniform block of text)
    await worker.setParameters({
      tessedit_pageseg_mode: '6', // Uniform block of text
    });
    
    console.log('Recognizing text from image...');
    const { data: { text } } = await worker.recognize(imageData);
    
    console.log('Terminating Tesseract worker...');
    await worker.terminate();
    
    const extractedText = text.trim();
    console.log('Tesseract extracted text, length:', extractedText.length);
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error('Tesseract extracted very little or no text. Image quality may be too low.');
    }
    
    return extractedText;
  } catch (error: any) {
    console.error('Tesseract.js error:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('Cannot find module') || error.message?.includes('require')) {
      throw new Error('Tesseract.js is not properly installed. Run: bun add tesseract.js');
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Tesseract.js requires network access to download language data. Please check your connection.');
    }
    if (error.message?.includes('Worker') || error.message?.includes('worker')) {
      throw new Error('Tesseract.js Web Workers are not supported in React Native. Please use OCR.space API instead.');
    }
    
    // Check if it's a React Native specific error
    const isReactNative = typeof (globalThis as any).navigator !== 'undefined' && (globalThis as any).navigator.product === 'ReactNative';
    if (isReactNative && (error.message?.includes('file://') || error.message?.includes('URI'))) {
      throw new Error('Tesseract.js has limited support in React Native. Please configure OCR.space API key for better results.');
    }
    
    throw new Error(`Tesseract OCR failed: ${error.message || 'Unknown error'}. For React Native, use OCR.space API instead.`);
  }
}

/**
 * Extract text from image using OCR
 * Tries OCR.space API first, falls back to Tesseract.js (web only), then throws error
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  // Get API key from environment - try multiple sources like Supabase does
  const apiKey = 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_OCR_SPACE_API_KEY ||
    Constants.manifest?.extra?.EXPO_PUBLIC_OCR_SPACE_API_KEY ||
    process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY ||
    'K82828017188957'; // Fallback to the provided key
  
  console.log('=== Starting OCR Process ===');
  console.log('Image URI:', imageUri.substring(0, 50) + '...');
  console.log('API Key provided:', !!apiKey);
  console.log('API Key value:', apiKey ? `${apiKey.substring(0, 5)}...` : 'none');
  
  // Check if we're in React Native - if so, skip Tesseract entirely
  const isReactNative = typeof (globalThis as any).navigator !== 'undefined' && (globalThis as any).navigator.product === 'ReactNative';
  const isExpo = typeof (global as any).__expo !== 'undefined';
  
  try {
    // Try OCR.space API first (best for receipts)
    console.log('[1/2] Attempting OCR with OCR.space API...');
    const result = await extractTextWithOCRSpace(imageUri, apiKey);
    console.log('✅ OCR.space API succeeded!');
    return result;
  } catch (ocrSpaceError: any) {
    console.error('❌ OCR.space API failed:', ocrSpaceError.message);
    console.error('Error details:', ocrSpaceError);
    
    // In React Native, skip Tesseract entirely since it doesn't work
    if (isReactNative || isExpo) {
      console.error('⚠️ Running in React Native/Expo - Tesseract.js is not supported.');
      console.error('💡 OCR.space API is the only supported OCR method in React Native.');
      
      // Provide detailed error message
      let errorMessage = 'OCR.space API failed. Please check your API key and try again.\n\n';
      errorMessage += `Error: ${ocrSpaceError.message}\n\n`;
      
      if (ocrSpaceError.message?.includes('quota') || ocrSpaceError.message?.includes('rate limit')) {
        errorMessage += 'Your OCR.space API quota may have been exceeded.\n';
        errorMessage += 'Please wait a few minutes or upgrade your plan.\n\n';
      } else if (ocrSpaceError.message?.includes('not configured') || ocrSpaceError.message?.includes('API key')) {
        errorMessage += 'The OCR.space API key is not properly configured.\n';
        errorMessage += 'Please ensure EXPO_PUBLIC_OCR_SPACE_API_KEY is set in app.json.\n\n';
      } else if (ocrSpaceError.message?.includes('network') || ocrSpaceError.message?.includes('fetch')) {
        errorMessage += 'Network error. Please check your internet connection.\n\n';
      }
      
      errorMessage += 'To fix this:\n';
      errorMessage += '1. Verify your API key is correct in app.json\n';
      errorMessage += '2. Check your internet connection\n';
      errorMessage += '3. Try again in a few moments\n';
      errorMessage += '4. If the problem persists, enter receipt details manually';
      
      throw new Error(errorMessage);
    }
    
    // For web environments only, try Tesseract as fallback
    try {
      console.log('[2/2] Trying Tesseract.js fallback (web only)...');
      const result = await extractTextWithTesseract(imageUri);
      console.log('✅ Tesseract.js succeeded!');
      return result;
    } catch (tesseractError: any) {
      console.error('❌ Tesseract.js also failed:', tesseractError.message);
      
      // Final error with both failures
      throw new Error(
        'All OCR services failed. Please enter receipt details manually.\n\n' +
        `OCR.space Error: ${ocrSpaceError.message}\n` +
        `Tesseract Error: ${tesseractError.message}\n\n` +
        'To enable OCR:\n' +
        '1. Get a free API key from https://ocr.space/ocrapi/freekey\n' +
        '2. Add EXPO_PUBLIC_OCR_SPACE_API_KEY=your_key to app.json\n' +
        '3. Restart the app'
      );
    }
  }
}

/**
 * Mock OCR - Simulates text extraction
 * This should NOT be used in production - it returns dummy data
 * Instead, throw an error to force manual entry
 */
async function mockOCR(imageUri: string): Promise<string> {
  // In production, we should NOT use mock OCR
  // Instead, throw an error to inform the user that OCR is not available
  throw new Error(
    'OCR services are not available. Please enter receipt details manually.\n\n' +
    'To enable OCR:\n' +
    '1. Get a free API key from https://ocr.space/ocrapi/freekey\n' +
    '2. Add EXPO_PUBLIC_OCR_SPACE_API_KEY=your_key to .env file\n' +
    '3. Restart the app'
  );
}

/**
 * Parse receipt text and extract structured data
 */
export function parseReceiptText(text: string, businessCurrency: string = 'USD'): ReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const receiptData: ReceiptData = {};
  
  // Extract merchant name (usually first line or contains common store keywords)
  const merchantKeywords = ['SHOP', 'STORE', 'MARKET', 'SUPERMARKET', 'RESTAURANT', 'CAFE', 'GARAGE', 'STATION'];
  for (const line of lines.slice(0, 5)) {
    const upperLine = line.toUpperCase();
    if (merchantKeywords.some(keyword => upperLine.includes(keyword))) {
      receiptData.merchant = line;
      break;
    }
  }
  
  // If no merchant found, use first non-empty line
  if (!receiptData.merchant && lines.length > 0) {
    receiptData.merchant = lines[0];
  }
  
  // Extract date (look for date patterns)
  const datePatterns = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,  // YYYY-MM-DD or YYYY/MM/DD
    /(\d{2}[-/]\d{2}[-/]\d{4})/,  // DD-MM-YYYY or DD/MM/YYYY
    /(\d{1,2}\/\d{1,2}\/\d{4})/,  // M/D/YYYY
    /Date:\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    /Date:\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
  ];
  
  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let dateStr = match[1];
        // Normalize date format to YYYY-MM-DD
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts[2].length === 4) {
            // Assume MM/DD/YYYY or DD/MM/YYYY
            if (parts[0].length === 4) {
              dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            } else {
              // Try DD/MM/YYYY first, then MM/DD/YYYY
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]);
              if (day > 12) {
                // Must be DD/MM/YYYY
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else {
                // Could be either, default to MM/DD/YYYY
                dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
              }
            }
          }
        }
        receiptData.date = dateStr;
        break;
      }
    }
    if (receiptData.date) break;
  }
  
  // If no date found, use today's date
  if (!receiptData.date) {
    receiptData.date = new Date().toISOString().split('T')[0];
  }
  
  // Extract address (look for street addresses, usually after merchant name)
  const addressPatterns = [
    /\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct)[,\s]*[A-Za-z\s,]+/i,
    /([A-Za-z\s]+,\s*[A-Za-z\s]+)/, // City, Country format
  ];
  
  // Look for address after merchant name (usually within first 10 lines)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    // Skip if it's the merchant name or date
    if (line === receiptData.merchant || /Date|Time|Tel|Phone/i.test(line)) {
      continue;
    }
    // Check if line looks like an address (has numbers and text, or city format)
    if (/\d/.test(line) && /[A-Za-z]/.test(line) && line.length > 10) {
      // Check for common address indicators
      if (/Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Circle|Ct|Tel|Phone|Address/i.test(line)) {
        receiptData.address = line;
        break;
      }
    }
  }
  
  // Extract total amount (look for "TOTAL", "AMOUNT", "GRAND TOTAL", etc.)
  // IMPORTANT: Skip "CHANGE" amounts - they're not the total!
  const totalPatterns = [
    /TOTAL[:\s]*([\d,]+\.?\d*)/i,
    /AMOUNT[:\s]*([\d,]+\.?\d*)/i,
    /GRAND\s*TOTAL[:\s]*([\d,]+\.?\d*)/i,
    /TOTAL\s*DUE[:\s]*([\d,]+\.?\d*)/i,
    /^TOTAL\s+([\d,]+\.?\d*)$/i,
  ];
  
  // Also look for amounts at the end of lines (common receipt format)
  const amountAtEndPattern = /([\d,]+\.\d{2})\s*$/;
  
  // Skip keywords that indicate this is NOT the total
  const totalSkipKeywords = ['CHANGE', 'CASH', 'CARD', 'DEBIT', 'CREDIT', 'BALANCE', 'REFUND', 'RETURN'];
  
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Skip lines with change, cash, card, etc. - these are NOT the total
    if (totalSkipKeywords.some(keyword => upperLine.includes(keyword))) {
      continue;
    }
    
    // Check for explicit total patterns
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          receiptData.amount = amount;
          break;
        }
      }
    }
    
    // Check for amount at end of line (common format: "TOTAL          20.76")
    // But only if it doesn't contain skip keywords
    if (!receiptData.amount && !totalSkipKeywords.some(keyword => upperLine.includes(keyword))) {
      const match = line.match(amountAtEndPattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        // Make sure it's a reasonable amount (not too small, not too large)
        if (!isNaN(amount) && amount > 0 && amount < 100000 && amount >= 1) {
          receiptData.amount = amount;
          break;
        }
      }
    }
    
    if (receiptData.amount) break;
  }
  
  // If no total found, try to calculate from items
  if (!receiptData.amount && receiptData.items && receiptData.items.length > 0) {
    let calculatedTotal = 0;
    for (const item of receiptData.items) {
      // Extract price from item string (format: "ITEM - USD 4.20" or "ITEM - 4.20")
      const priceMatch = item.match(/-?\s*(?:USD\s*)?([\d,]+\.\d{2})\s*$/i) || item.match(/-?\s*USD\s*([\d,]+\.?\d*)/i);
      if (priceMatch) {
        const priceStr = (priceMatch[1] || priceMatch[2] || '').replace(/,/g, '');
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0 && price < 100000) {
          calculatedTotal += price;
        }
      }
    }
    if (calculatedTotal > 0) {
      receiptData.amount = calculatedTotal;
    }
  }
  
  // Extract tax amount
  const taxPatterns = [
    /TAX[:\s(]*(\d+%)?[:\s)]*([\d,]+\.?\d*)/i,
    /VAT[:\s(]*(\d+%)?[:\s)]*([\d,]+\.?\d*)/i,
    /GST[:\s(]*(\d+%)?[:\s)]*([\d,]+\.?\d*)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of taxPatterns) {
      const match = line.match(pattern);
      if (match && match[2]) {
        const taxStr = match[2].replace(/,/g, '');
        const tax = parseFloat(taxStr);
        if (!isNaN(tax) && tax > 0) {
          receiptData.tax = tax;
          break;
        }
      }
    }
    if (receiptData.tax) break;
  }
  
  // Extract subtotal
  const subtotalPatterns = [
    /SUBTOTAL[:\s]*([\d,]+\.?\d*)/i,
    /SUB\s*TOTAL[:\s]*([\d,]+\.?\d*)/i,
  ];
  
  for (const line of lines) {
    for (const pattern of subtotalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const subtotalStr = match[1].replace(/,/g, '');
        const subtotal = parseFloat(subtotalStr);
        if (!isNaN(subtotal) && subtotal > 0) {
          receiptData.subtotal = subtotal;
          break;
        }
      }
    }
    if (receiptData.subtotal) break;
  }
  
  // Extract items (lines that look like product descriptions with prices)
  // Multiple patterns to handle different receipt formats
  const itemPatterns = [
    /^(.+?)\s+([\d,]+\.\d{2})\s*$/,  // Standard: "ITEM NAME    12.50"
    /^(.+?)\s+x\s*(\d+)\s+@\s*([\d,]+\.\d{2})\s*$/,  // Quantity format: "ITEM x 2 @ 5.00"
    /^(.+?)\s+(\d+)\s+([\d,]+\.\d{2})\s*$/,  // Quantity and price: "ITEM 2 10.00"
    /^(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/,  // Price and total: "ITEM 5.00 10.00"
    /(.+?)\s*-\s*USD\s*([\d,]+\.\d{2})/i,  // Format: "ITEM - USD 4.20"
    /(.+?)\s*-\s*ZWL\s*([\d,]+\.\d{2})/i,  // Format: "ITEM - ZWL 4.20"
    /(.+?)\s*-\s*\$?\s*([\d,]+\.\d{2})/i,  // Format: "ITEM - $4.20" or "ITEM - 4.20"
    /^(.+?)\s+\$\s*([\d,]+\.\d{2})\s*$/,  // Format: "ITEM $4.20"
    /^(.+?)\s+([\d,]+\.\d{2})\s*USD/i,  // Format: "ITEM 4.20 USD"
    /^(.+?)\s+([\d,]+\.\d{2})\s*ZWL/i,  // Format: "ITEM 4.20 ZWL"
  ];
  
  receiptData.items = [];
  const skipKeywords = [
    'TOTAL', 'TAX', 'SUBTOTAL', 'CASH', 'CHANGE', 'THANK', 'DATE', 'TIME', 
    'CASHIER', 'RECEIPT', 'INVOICE', 'AMOUNT', 'DUE', 'PAID', 'BALANCE',
    'DISCOUNT', 'SALE', 'SPECIAL', 'PROMO', 'CARD', 'DEBIT', 'CREDIT',
    'REFUND', 'RETURN', 'EXCHANGE', 'VAT', 'GST', 'SERVICE', 'CHARGE'
  ];
  
  // Find the start of items section (usually after merchant info)
  let itemsStartIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const upperLine = lines[i].toUpperCase();
    if (upperLine.includes('ITEM') || upperLine.includes('PRODUCT') || 
        upperLine.includes('DESCRIPTION') || /^\d+/.test(lines[i])) {
      itemsStartIndex = i;
      break;
    }
  }
  
  // Find the end of items section (usually before totals)
  let itemsEndIndex = lines.length;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
    const upperLine = lines[i].toUpperCase();
    if (skipKeywords.some(keyword => upperLine.includes(keyword))) {
      itemsEndIndex = i;
      break;
    }
  }
  
  // Extract items from the identified section
  for (let i = itemsStartIndex; i < itemsEndIndex; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and header lines
    if (!line || line.length < 3) continue;
    
    const upperLine = line.toUpperCase();
    if (skipKeywords.some(keyword => upperLine.includes(keyword))) {
      continue;
    }
    
    // Handle multiple items in one line (e.g., "N - USD 4.20 SUGAR 1KG - USD 2.10 RICE 2KG - USD 5.50")
    // Split by " - USD " or " - " followed by a price pattern
    const multiItemPattern = /(.+?)\s*-\s*(?:USD\s*)?([\d,]+\.\d{2})/gi;
    const multiItemMatches = [...line.matchAll(multiItemPattern)];
    
    if (multiItemMatches.length > 1) {
      // Multiple items in one line
      for (const match of multiItemMatches) {
        const itemName = match[1].trim();
        const itemPrice = match[2].replace(/,/g, '');
        const price = parseFloat(itemPrice);
        
        if (itemName.length > 1 && !isNaN(price) && price > 0 && price < 100000) {
          if (price === receiptData.amount || price === receiptData.subtotal) {
            continue; // Skip if it matches total/subtotal
          }
          receiptData.items.push(`${itemName} - ${businessCurrency} ${price.toFixed(2)}`);
        }
      }
      continue; // Skip to next line
    }
    
    // Try each pattern for single item lines
    let matched = false;
    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        let itemName = '';
        let itemPrice = '';
        let quantity = '';
        
        if (pattern === itemPatterns[0]) {
          // Standard format: "ITEM NAME    12.50"
          itemName = match[1].trim();
          itemPrice = match[2].replace(/,/g, '');
        } else if (pattern === itemPatterns[1]) {
          // Quantity format: "ITEM x 2 @ 5.00"
          itemName = match[1].trim();
          quantity = match[2];
          itemPrice = match[3].replace(/,/g, '');
        } else if (pattern === itemPatterns[2]) {
          // Quantity and price: "ITEM 2 10.00"
          itemName = match[1].trim();
          quantity = match[2];
          itemPrice = match[3].replace(/,/g, '');
        } else if (pattern === itemPatterns[3]) {
          // Price and total: "ITEM 5.00 10.00"
          itemName = match[1].trim();
          itemPrice = match[3].replace(/,/g, ''); // Use the last price as total
        } else if (pattern === itemPatterns[4] || pattern === itemPatterns[5] || pattern === itemPatterns[6]) {
          // Format: "ITEM - USD 4.20", "ITEM - ZWL 4.20", or "ITEM - $4.20" or "ITEM - 4.20"
          itemName = match[1].trim();
          itemPrice = match[2].replace(/,/g, '');
        } else if (pattern === itemPatterns[7]) {
          // Format: "ITEM $4.20"
          itemName = match[1].trim();
          itemPrice = match[2].replace(/,/g, '');
        } else if (pattern === itemPatterns[8] || pattern === itemPatterns[9]) {
          // Format: "ITEM 4.20 USD" or "ITEM 4.20 ZWL"
          itemName = match[1].trim();
          itemPrice = match[2].replace(/,/g, '');
        }
        
        // Validate it's a reasonable item
        const price = parseFloat(itemPrice);
        if (itemName.length > 2 && !isNaN(price) && price > 0 && price < 100000) {
          // Skip if it looks like a total amount (very large or matches total patterns)
          if (price === receiptData.amount || price === receiptData.subtotal) {
            continue;
          }
          
          let itemString = itemName;
          if (quantity) {
            itemString += ` (Qty: ${quantity})`;
          }
          itemString += ` - ${businessCurrency} ${price.toFixed(2)}`;
          
          receiptData.items.push(itemString);
          matched = true;
          break;
        }
      }
    }
    
    // If no pattern matched but line looks like an item (has text and number)
    if (!matched && /[a-zA-Z]/.test(line) && /[\d,]+\.?\d*/.test(line)) {
      // Try multiple patterns to extract price
      const pricePatterns = [
        /([\d,]+\.\d{2})\s*$/,  // Price at end: "ITEM 4.20"
        /\$\s*([\d,]+\.\d{2})\s*$/,  // Dollar sign: "ITEM $4.20"
        /([\d,]+\.\d{2})\s*USD/i,  // With USD: "ITEM 4.20 USD"
        /([\d,]+\.\d{2})\s*ZWL/i,  // With ZWL: "ITEM 4.20 ZWL"
        /-\s*\$?\s*([\d,]+\.\d{2})/i,  // Dash format: "ITEM - 4.20"
      ];
      
      for (const pricePattern of pricePatterns) {
        const priceMatch = line.match(pricePattern);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(/,/g, ''));
          if (price > 0 && price < 100000 && price !== receiptData.amount && price !== receiptData.subtotal) {
            // Extract item name by removing price and currency symbols
            let itemName = line
              .replace(priceMatch[0], '')
              .replace(/\s*-\s*$/i, '')
              .replace(/\$\s*$/i, '')
              .trim();
            
            if (itemName.length > 2) {
              receiptData.items.push(`${itemName} - ${businessCurrency} ${price.toFixed(2)}`);
              matched = true;
              break;
            }
          }
        }
      }
    }
  }
  
  // Infer category from merchant name
  if (receiptData.merchant) {
    const merchantUpper = receiptData.merchant.toUpperCase();
    if (merchantUpper.includes('SHOP') || merchantUpper.includes('MARKET') || merchantUpper.includes('STORE')) {
      receiptData.category = 'Groceries';
    } else if (merchantUpper.includes('RESTAURANT') || merchantUpper.includes('CAFE') || merchantUpper.includes('FOOD')) {
      receiptData.category = 'Food & Dining';
    } else if (merchantUpper.includes('GAS') || merchantUpper.includes('PETROL') || merchantUpper.includes('FUEL') || merchantUpper.includes('STATION')) {
      receiptData.category = 'Fuel';
    } else if (merchantUpper.includes('PHARMACY') || merchantUpper.includes('MEDICAL') || merchantUpper.includes('CLINIC')) {
      receiptData.category = 'Healthcare';
    } else if (merchantUpper.includes('HARDWARE') || merchantUpper.includes('BUILDING')) {
      receiptData.category = 'Supplies';
    }
  }
  
  return receiptData;
}

/**
 * Process receipt image and extract structured data
 */
export async function processReceiptImage(imageUri: string, businessCurrency: string = 'USD'): Promise<ReceiptData> {
  try {
    // Extract text from image
    const text = await extractTextFromImage(imageUri);
    
    // Parse text into structured data
    const receiptData = parseReceiptText(text, businessCurrency);
    
    return receiptData;
  } catch (error) {
    console.error('Receipt processing error:', error);
    throw error;
  }
}

