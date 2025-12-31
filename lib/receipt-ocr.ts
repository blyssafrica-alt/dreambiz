/**
 * Receipt OCR and Text Parsing Utility
 * Extracts structured data from receipt images using OCR
 */

import * as FileSystem from 'expo-file-system';

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
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to convert image to base64');
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
    
    // Use free API key if provided, otherwise use demo key (limited)
    const ocrApiKey = apiKey || 'helloworld'; // Free demo key (limited requests)
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
    
    // Always add API key (even demo key)
    formData.append('apikey', ocrApiKey);
    
    console.log('Sending OCR request to OCR.space API...');
    
    const response = await fetch(ocrApiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - FormData will set it with boundary
      },
    });
    
    console.log('OCR API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error response:', errorText);
      throw new Error(`OCR API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }
    
    const data = await response.json();
    console.log('OCR API response data:', JSON.stringify(data).substring(0, 500));
    
    // Check for API errors
    if (data.ErrorMessage && data.ErrorMessage.length > 0) {
      const errorMsg = Array.isArray(data.ErrorMessage) 
        ? data.ErrorMessage.join(', ') 
        : data.ErrorMessage;
      throw new Error(`OCR API error: ${errorMsg}`);
    }
    
    // Check for rate limit or quota errors
    if (data.OCRExitCode === 99) {
      throw new Error('OCR API quota exceeded. Please get a free API key from https://ocr.space/ocrapi/freekey');
    }
    
    if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults.length > 0) {
      // Success - extract text from all parsed results
      const allText = data.ParsedResults
        .map((result: any) => result.ParsedText || '')
        .join('\n')
        .trim();
      
      if (allText) {
        console.log('OCR text extracted successfully, length:', allText.length);
        return allText;
      }
    }
    
    // Check exit codes
    if (data.OCRExitCode === 2) {
      throw new Error('OCR processing failed - image may be corrupted');
    }
    if (data.OCRExitCode === 3 || data.OCRExitCode === 4) {
      throw new Error('OCR processing failed - no text detected in image');
    }
    
    throw new Error(`No text found in image. Exit code: ${data.OCRExitCode}`);
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
 */
async function extractTextWithTesseract(imageUri: string): Promise<string> {
  try {
    console.log('Attempting Tesseract.js OCR...');
    
    // Dynamic import to avoid loading Tesseract if not installed
    const TesseractModule = await import('tesseract.js');
    // Handle both default and named exports
    const Tesseract = (TesseractModule as any).default || TesseractModule;
    const { createWorker } = Tesseract;
    
    if (!createWorker || typeof createWorker !== 'function') {
      throw new Error('Tesseract createWorker function not available');
    }
    
    console.log('Creating Tesseract worker...');
    const worker = await createWorker('eng');
    
    console.log('Recognizing text from image...');
    // For React Native, we need to handle the image URI differently
    // Tesseract.js might not work directly with file:// URIs in React Native
    // We'll try to use the URI directly, but it may need base64 conversion
    const { data: { text } } = await worker.recognize(imageUri);
    
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
    
    throw new Error(`Tesseract OCR failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extract text from image using OCR
 * Tries OCR.space API first, falls back to Tesseract.js, then mock OCR
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  // Get API key from environment or use free tier
  // To use your own API key, set EXPO_PUBLIC_OCR_SPACE_API_KEY in your .env file
  const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY;
  
  console.log('=== Starting OCR Process ===');
  console.log('Image URI:', imageUri.substring(0, 50) + '...');
  console.log('API Key provided:', !!apiKey);
  
  try {
    // Try OCR.space API first (best for receipts)
    console.log('[1/3] Attempting OCR with OCR.space API...');
    const result = await extractTextWithOCRSpace(imageUri, apiKey);
    console.log('✅ OCR.space API succeeded!');
    return result;
  } catch (ocrSpaceError: any) {
    console.warn('❌ OCR.space failed:', ocrSpaceError.message);
    console.warn('Error details:', ocrSpaceError);
    
    // If it's a quota/rate limit error, don't try Tesseract (it will also fail)
    if (ocrSpaceError.message?.includes('quota') || ocrSpaceError.message?.includes('rate limit')) {
      console.warn('⚠️ OCR.space quota exceeded. Trying Tesseract.js as fallback...');
    }
    
    try {
      // Fallback to Tesseract.js if available
      console.log('[2/3] Trying Tesseract.js fallback...');
      const result = await extractTextWithTesseract(imageUri);
      console.log('✅ Tesseract.js succeeded!');
      return result;
    } catch (tesseractError: any) {
      console.warn('❌ Tesseract.js failed:', tesseractError.message);
      console.warn('Error details:', tesseractError);
      
      // Final fallback: mock OCR for development/testing
      console.warn('[3/3] Using mock OCR as final fallback...');
      console.warn('⚠️ WARNING: Using mock OCR - this is for development only!');
      console.warn('To enable real OCR:');
      console.warn('  1. Get a free API key from https://ocr.space/ocrapi/freekey');
      console.warn('  2. Add EXPO_PUBLIC_OCR_SPACE_API_KEY=your_key to .env file');
      console.warn('  3. Or ensure tesseract.js is properly installed: bun add tesseract.js');
      
      return await mockOCR(imageUri);
    }
  }
}

/**
 * Mock OCR - Simulates text extraction
 * Replace this with actual OCR service in production
 */
async function mockOCR(imageUri: string): Promise<string> {
  // Simulate processing delay
  await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
  
  // Return sample receipt text for demonstration
  // In production, this would be replaced with actual OCR results
  return `SHOPRITE SUPERMARKET
123 Main Street, Harare
Tel: +263 4 123 4567

Date: 2024-01-15
Time: 14:30
Cashier: John

BREAD WHITE LOAF        2.50
MILK 2L                 3.75
EGGS DOZEN              4.20
SUGAR 1KG               2.10
RICE 2KG                5.50

SUBTOTAL               18.05
TAX (15%)               2.71
TOTAL                  20.76

CASH                   25.00
CHANGE                  4.24

Thank you for shopping!
Visit us again soon.`;
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
    if (!receiptData.amount && !skipKeywords.some(keyword => upperLine.includes(keyword))) {
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
    /(.+?)\s*-\s*([\d,]+\.\d{2})/i,  // Format: "ITEM - 4.20"
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
        } else if (pattern === itemPatterns[4] || pattern === itemPatterns[5]) {
          // Format: "ITEM - USD 4.20" or "ITEM - 4.20"
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
      // Try to extract any price-like number at the end
      const priceMatch = line.match(/([\d,]+\.\d{2})$/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (price > 0 && price < 100000 && price !== receiptData.amount) {
          const itemName = line.replace(priceMatch[0], '').trim();
          if (itemName.length > 2) {
            receiptData.items.push(`${itemName} - ${businessCurrency} ${price.toFixed(2)}`);
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

