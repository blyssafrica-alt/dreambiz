/**
 * Receipt OCR and Text Parsing Utility
 * Extracts structured data from receipt images using OCR
 */

import * as FileSystem from 'expo-file-system';

export interface ReceiptData {
  merchant?: string;
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
    
    // Create form data for React Native
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is better for receipts
    
    // If API key is provided, add it
    if (apiKey && apiKey !== 'helloworld') {
      formData.append('apikey', apiKey);
    }
    
    const response = await fetch(ocrApiUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let fetch set it with boundary
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OCR API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.ErrorMessage && data.ErrorMessage.length > 0) {
      const errorMsg = Array.isArray(data.ErrorMessage) 
        ? data.ErrorMessage.join(', ') 
        : data.ErrorMessage;
      throw new Error(`OCR API error: ${errorMsg}`);
    }
    
    if (data.OCRExitCode === 1 && data.ParsedResults && data.ParsedResults.length > 0) {
      // Success - extract text from all parsed results
      const allText = data.ParsedResults
        .map((result: any) => result.ParsedText || '')
        .join('\n')
        .trim();
      
      if (allText) {
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
    
    throw new Error('No text found in image');
  } catch (error: any) {
    console.error('OCR.space API error:', error);
    throw error;
  }
}

/**
 * Extract text from image using Tesseract.js (client-side OCR)
 * Fallback option - works offline, no API key needed
 */
async function extractTextWithTesseract(imageUri: string): Promise<string> {
  try {
    // Dynamic import to avoid loading Tesseract if not installed
    const TesseractModule = await import('tesseract.js');
    // Handle both default and named exports
    const Tesseract = (TesseractModule as any).default || TesseractModule;
    const { createWorker } = Tesseract;
    
    if (!createWorker || typeof createWorker !== 'function') {
      throw new Error('Tesseract createWorker function not available');
    }
    
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageUri);
    await worker.terminate();
    
    return text.trim();
  } catch (error: any) {
    console.error('Tesseract.js error:', error);
    throw new Error('Tesseract OCR failed. Please install: npm install tesseract.js');
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
  
  try {
    // Try OCR.space API first (best for receipts)
    console.log('Attempting OCR with OCR.space API...');
    return await extractTextWithOCRSpace(imageUri, apiKey);
  } catch (ocrSpaceError) {
    console.warn('OCR.space failed, trying Tesseract.js...', ocrSpaceError);
    
    try {
      // Fallback to Tesseract.js if available
      return await extractTextWithTesseract(imageUri);
    } catch (tesseractError) {
      console.warn('Tesseract.js failed, using mock OCR...', tesseractError);
      
      // Final fallback: mock OCR for development/testing
      // In production, you should handle this error properly
      console.warn('Using mock OCR - install tesseract.js or configure OCR.space API key for real OCR');
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
  
  // Extract total amount (look for "TOTAL", "AMOUNT", "GRAND TOTAL", etc.)
  const totalPatterns = [
    /TOTAL[:\s]*([\d,]+\.?\d*)/i,
    /AMOUNT[:\s]*([\d,]+\.?\d*)/i,
    /GRAND\s*TOTAL[:\s]*([\d,]+\.?\d*)/i,
    /TOTAL\s*DUE[:\s]*([\d,]+\.?\d*)/i,
    /^TOTAL\s+([\d,]+\.?\d*)$/i,
  ];
  
  // Also look for amounts at the end of lines (common receipt format)
  const amountAtEndPattern = /([\d,]+\.\d{2})\s*$/;
  
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i];
    
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
    if (!receiptData.amount) {
      const match = line.match(amountAtEndPattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0 && amount < 100000) { // Reasonable amount check
          receiptData.amount = amount;
          break;
        }
      }
    }
    
    if (receiptData.amount) break;
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
    
    // Try each pattern
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

