# receipt OCR Setup Guide

## Overview

The receipt scanning feature now includes **real OCR (Optical Character Recognition)** functionality that automatically extracts information from receipt images. The system:

1. **Extracts text** from receipt images using OCR
2. **Parses the text** to identify key information:
   - Merchant/Store name
   - Total amount
   - Date
   - Tax amount
   - Subtotal
   - Line items
   - Category (inferred from merchant)
3. **Pre-fills the form** with extracted data
4. **Allows user review** and editing before saving

## Current Implementation

The current implementation uses a **mock OCR** function that simulates text extraction. This is perfect for:
- Development and testing
- Demonstrating the feature
- Understanding the data flow

## Integrating Real OCR Services

To use **real OCR** in production, you need to integrate one of the following services:

### Option 1: Google Cloud Vision API (Recommended)

**Pros:**
- High accuracy
- Fast processing
- Good for receipts and documents
- Free tier: 1,000 requests/month

**Setup:**
1. Get a Google Cloud Vision API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Vision API
3. Update `lib/receipt-ocr.ts`:

```typescript
export async function extractTextFromImage(imageUri: string): Promise<string> {
  // Convert local URI to base64
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

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
              content: base64Image,
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
  
  throw new Error('No text found in image');
}
```

**Install required package:**
```bash
bun add expo-file-system
```

### Option 2: Tesseract.js (Client-Side OCR)

**Pros:**
- No API keys needed
- Works offline
- Free and open-source
- Good for simple receipts

**Cons:**
- Lower accuracy than cloud services
- Slower processing
- Larger app size

**Setup:**
1. Install Tesseract.js:
```bash
bun add tesseract.js
```

2. Update `lib/receipt-ocr.ts`:

```typescript
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(imageUri: string): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(imageUri, 'eng', {
    logger: (m) => console.log(m),
  });
  return text;
}
```

### Option 3: AWS Textract

**Pros:**
- Very high accuracy
- Excellent for structured documents
- Good for receipts with tables

**Setup:**
1. Set up AWS Textract in AWS Console
2. Install AWS SDK:
```bash
bun add @aws-sdk/client-textract
```

3. Update `lib/receipt-ocr.ts` to use AWS Textract API

### Option 4: Azure Computer Vision

**Pros:**
- High accuracy
- Good OCR capabilities
- Free tier available

**Setup:**
1. Get Azure Computer Vision API key
2. Update `lib/receipt-ocr.ts` to call Azure API

### Option 5: OCR.space API

**Pros:**
- Free tier available
- Easy to use
- Good for simple receipts

**Setup:**
1. Get API key from [OCR.space](https://ocr.space/)
2. Update `lib/receipt-ocr.ts`:

```typescript
export async function extractTextFromImage(imageUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('apikey', 'YOUR_API_KEY');
  formData.append('language', 'eng');
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'receipt.jpg',
  } as any);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (data.ParsedResults && data.ParsedResults[0]) {
    return data.ParsedResults[0].ParsedText;
  }
  
  throw new Error('No text found');
}
```

## Text Parsing

The `parseReceiptText()` function in `lib/receipt-ocr.ts` intelligently extracts:

- **Merchant Name**: Identifies store names from common keywords
- **Date**: Parses various date formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
- **Total Amount**: Finds "TOTAL", "AMOUNT", "GRAND TOTAL" patterns
- **Tax**: Extracts tax/VAT/GST amounts
- **Subtotal**: Finds subtotal amounts
- **Items**: Parses line items with prices
- **Category**: Infers category from merchant name (Groceries, Fuel, Food & Dining, etc.)

## Customization

You can customize the parsing logic in `lib/receipt-ocr.ts`:

1. **Add more date patterns** in the `datePatterns` array
2. **Add more merchant keywords** in the `merchantKeywords` array
3. **Enhance category inference** by adding more merchant-to-category mappings
4. **Improve amount extraction** by adding more patterns

## Testing

The mock OCR currently returns a sample receipt for testing. To test with real receipts:

1. Integrate one of the OCR services above
2. Take photos of real receipts
3. Verify extracted data accuracy
4. Adjust parsing patterns as needed

## Security Notes

- **Never commit API keys** to version control
- Use environment variables for API keys:
  ```typescript
  const API_KEY = process.env.GOOGLE_VISION_API_KEY;
  ```
- Consider using a backend proxy to hide API keys from the client

## Performance Tips

1. **Image Preprocessing**: Resize/compress images before OCR for faster processing
2. **Caching**: Cache OCR results for the same image
3. **Background Processing**: Process OCR in background to avoid blocking UI
4. **Error Handling**: Always provide fallback to manual entry if OCR fails

## Next Steps

1. Choose an OCR service based on your needs
2. Update `extractTextFromImage()` in `lib/receipt-ocr.ts`
3. Test with real receipts
4. Fine-tune parsing patterns for your region/receipt formats
5. Add error handling and retry logic
6. Consider adding image preprocessing (rotation, contrast, etc.)

## Support

For issues or questions about OCR integration, refer to:
- Google Cloud Vision: https://cloud.google.com/vision/docs
- Tesseract.js: https://github.com/naptha/tesseract.js
- AWS Textract: https://aws.amazon.com/textract/
- Azure Computer Vision: https://azure.microsoft.com/services/cognitive-services/computer-vision/

