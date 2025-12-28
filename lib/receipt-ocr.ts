/**
 * Receipt OCR and Text Parsing Utility
 * Extracts structured data from receipt images using OCR
 */

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
 * Extract text from image using OCR
 * This uses Google Cloud Vision API or a fallback method
 */
export async function extractTextFromImage(imageUri: string): Promise<string> {
  try {
    // Option 1: Use Google Cloud Vision API (requires API key)
    // Uncomment and configure if you have a Google Cloud Vision API key
    /*
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUri,
                },
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );
    
    const data = await response.json();
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      return data.responses[0].textAnnotations[0].description;
    }
    */

    // Option 2: Use Tesseract.js (client-side OCR)
    // This requires installing: npm install tesseract.js
    /*
    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(imageUri, 'eng', {
      logger: (m) => console.log(m),
    });
    return text;
    */

    // Option 3: Use a local OCR service endpoint
    // You can set up your own OCR service or use services like:
    // - AWS Textract
    // - Azure Computer Vision
    // - OCR.space API
    // - Abbyy FineReader

    // For now, we'll use a mock implementation that simulates OCR
    // In production, replace this with actual OCR service
    return await mockOCR(imageUri);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Mock OCR - Simulates text extraction
 * Replace this with actual OCR service in production
 */
async function mockOCR(imageUri: string): Promise<string> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
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
export function parseReceiptText(text: string): ReceiptData {
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
  const itemPattern = /^(.+?)\s+([\d,]+\.\d{2})\s*$/;
  receiptData.items = [];
  
  for (const line of lines) {
    // Skip header lines, totals, etc.
    if (
      line.toUpperCase().includes('TOTAL') ||
      line.toUpperCase().includes('TAX') ||
      line.toUpperCase().includes('SUBTOTAL') ||
      line.toUpperCase().includes('CASH') ||
      line.toUpperCase().includes('CHANGE') ||
      line.toUpperCase().includes('THANK') ||
      line.toUpperCase().includes('DATE') ||
      line.toUpperCase().includes('TIME') ||
      line.toUpperCase().includes('CASHIER')
    ) {
      continue;
    }
    
    const match = line.match(itemPattern);
    if (match) {
      const itemName = match[1].trim();
      const itemPrice = match[2].replace(/,/g, '');
      
      // Validate it's a reasonable item (not a total amount)
      if (itemName.length > 2 && parseFloat(itemPrice) < 10000) {
        receiptData.items.push(`${itemName} - ${itemPrice}`);
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
export async function processReceiptImage(imageUri: string): Promise<ReceiptData> {
  try {
    // Extract text from image
    const text = await extractTextFromImage(imageUri);
    
    // Parse text into structured data
    const receiptData = parseReceiptText(text);
    
    return receiptData;
  } catch (error) {
    console.error('Receipt processing error:', error);
    throw error;
  }
}

