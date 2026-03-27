# Receipt OCR Setup Guide

## Overview

The receipt scanning feature now uses **real OCR (Optical Character Recognition)** to automatically extract information from receipt images. The system uses OCR.space API as the primary OCR service with automatic fallbacks.

## How It Works

1. **Primary**: OCR.space API (cloud-based, high accuracy)
2. **Fallback 1**: Tesseract.js (client-side, works offline)
3. **Fallback 2**: Mock OCR (for development/testing)

## Setup Instructions

### Option 1: OCR.space API (Recommended)

**Free Tier**: 25,000 requests/month

1. **Get a free API key**:
   - Visit: https://ocr.space/ocrapi/freekey
   - Sign up for a free account
   - Copy your API key

2. **Add API key to your app**:
   - Create a `.env` file in the root directory (if it doesn't exist)
   - Add your API key:
     ```
     EXPO_PUBLIC_OCR_SPACE_API_KEY=your_api_key_here
     ```
   - The app will automatically use this key for OCR requests

3. **No API key?** The app will use a demo key (limited requests) or fall back to Tesseract.js

### Option 2: Tesseract.js (Client-Side OCR)

**Pros**: 
- Works offline
- No API keys needed
- Free and open-source

**Cons**:
- Lower accuracy than cloud services
- Slower processing
- Larger app size

**Installation**:
```bash
bun add tesseract.js
```

The app will automatically use Tesseract.js if OCR.space fails.

## Features

The OCR system extracts:
- ✅ **Merchant/Store Name** - From receipt header
- ✅ **Total Amount** - From "TOTAL" lines
- ✅ **Date** - From date patterns (multiple formats supported)
- ✅ **Items** - Product descriptions with prices
- ✅ **Tax** - Tax/VAT amounts
- ✅ **Subtotal** - Subtotal amounts
- ✅ **Category** - Auto-inferred from merchant name

## Supported Receipt Formats

The parser supports various receipt formats:
- Standard receipts (item name + price)
- Quantity-based receipts (item x 2 @ 5.00)
- Receipts with tax breakdowns
- Multiple date formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
- Multiple currency formats

## Testing

1. **Take a photo** of a receipt using the app
2. **Wait for processing** (usually 2-5 seconds)
3. **Review extracted data** in the form
4. **Edit if needed** and save

## Troubleshooting

### "OCR API error" messages

1. **Check your API key** (if using OCR.space):
   - Verify it's set in `.env` as `EXPO_PUBLIC_OCR_SPACE_API_KEY`
   - Make sure there are no extra spaces or quotes

2. **Rate limiting**:
   - Free tier has limits
   - Wait a few minutes and try again
   - Consider upgrading to paid tier for higher limits

3. **Image quality**:
   - Ensure receipt is well-lit
   - Avoid blurry images
   - Make sure text is readable

4. **Network issues**:
   - Check internet connection
   - The app will fall back to Tesseract.js if available

### "No text found in image"

- Image may be too blurry
- Receipt text may be too small
- Try taking a clearer photo
- Ensure good lighting

## Advanced Configuration

### Using a Different OCR Service

You can modify `lib/receipt-ocr.ts` to use other OCR services:

- **Google Cloud Vision API**: High accuracy, requires API key
- **AWS Textract**: Excellent for structured documents
- **Azure Computer Vision**: Good OCR capabilities
- **Custom OCR Service**: Integrate your own service

### Image Preprocessing

For better OCR results, you can add image preprocessing:
- Image rotation correction
- Contrast enhancement
- Noise reduction
- Image resizing

## Security Notes

- ✅ API keys are stored in environment variables
- ✅ Never commit API keys to version control
- ✅ Use `.env` file (already in `.gitignore`)
- ✅ Consider using a backend proxy for production

## Performance Tips

1. **Image Size**: Larger images take longer to process
2. **Network**: Cloud OCR requires internet connection
3. **Caching**: Consider caching OCR results for the same image
4. **Background Processing**: OCR runs in background to avoid blocking UI

## Support

- **OCR.space**: https://ocr.space/ocrapi
- **Tesseract.js**: https://github.com/naptha/tesseract.js
- **Documentation**: See `lib/receipt-ocr.ts` for implementation details

## Next Steps

1. ✅ Get OCR.space API key (optional but recommended)
2. ✅ Test with real receipts
3. ✅ Fine-tune parsing patterns if needed
4. ✅ Monitor API usage and costs
