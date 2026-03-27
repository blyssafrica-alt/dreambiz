# Receipt OCR Troubleshooting Guide

## Why Receipt OCR Might Not Be Working

The receipt scanner uses a **3-tier fallback system**:
1. **OCR.space API** (Primary - Cloud-based, best accuracy)
2. **Tesseract.js** (Fallback - Client-side, works offline)
3. **Mock OCR** (Final fallback - Development/testing only)

## Common Issues and Solutions

### Issue 1: OCR.space API Quota Exceeded

**Symptoms:**
- Error message: "OCR API quota exceeded"
- Error code: 99
- Receipt scanning fails immediately

**Solutions:**
1. **Get a free API key** (25,000 requests/month):
   - Visit: https://ocr.space/ocrapi/freekey
   - Sign up for a free account
   - Copy your API key

2. **Add API key to your app:**
   - Create a `.env` file in the root directory
   - Add: `EXPO_PUBLIC_OCR_SPACE_API_KEY=your_api_key_here`
   - Restart your development server

3. **Wait a few minutes** if using the demo key (limited requests)

### Issue 2: Tesseract.js Not Working

**Symptoms:**
- Error: "Cannot find module 'tesseract.js'"
- Error: "Tesseract createWorker function not available"
- Network errors when downloading language data

**Solutions:**
1. **Install Tesseract.js:**
   ```bash
   bun add tesseract.js
   ```

2. **Verify installation:**
   ```bash
   bun list | grep tesseract
   ```
   Should show: `tesseract.js@7.0.0`

3. **Check network connection** - Tesseract.js needs internet to download language data on first use

4. **Note:** Tesseract.js may not work perfectly in React Native/Expo. It's primarily designed for web/Node.js environments.

### Issue 3: Network/Connection Errors

**Symptoms:**
- "Network error" or "fetch failed"
- Timeout errors
- CORS errors

**Solutions:**
1. **Check internet connection**
2. **Check if OCR.space API is accessible:**
   - Visit: https://api.ocr.space/parse/image
   - Should return an error (not a 404)

3. **Check firewall/proxy settings** if on a corporate network

### Issue 4: Image Quality Issues

**Symptoms:**
- "No text detected in image"
- Very little or incorrect text extracted
- OCR exit code 3 or 4

**Solutions:**
1. **Use clear, well-lit images**
2. **Ensure receipt is in focus**
3. **Avoid glare and shadows**
4. **Use high resolution images** (at least 300 DPI)

### Issue 5: FormData Issues (React Native)

**Symptoms:**
- "FormData is not defined"
- "Cannot append to FormData"
- API returns 400 Bad Request

**Solutions:**
- This should be fixed in the latest code
- If issues persist, check React Native version compatibility

## Dependencies Checklist

### Required Dependencies (Already Installed)
- ✅ `tesseract.js@^7.0.0` - Client-side OCR fallback
- ✅ `expo-file-system` - For reading image files
- ✅ `expo-image-picker` - For selecting images

### Optional Dependencies
- `.env` file with `EXPO_PUBLIC_OCR_SPACE_API_KEY` - For OCR.space API

## How to Verify Everything is Working

1. **Check console logs:**
   - Look for: `=== Starting OCR Process ===`
   - Should see: `[1/3] Attempting OCR with OCR.space API...`
   - Or: `[2/3] Trying Tesseract.js fallback...`
   - Success: `✅ OCR.space API succeeded!` or `✅ Tesseract.js succeeded!`

2. **Test with a clear receipt:**
   - Take a photo of a clear, well-lit receipt
   - Check if text is extracted correctly
   - Verify amount, merchant, date are populated

3. **Check error messages:**
   - Read the error message carefully
   - Follow the specific solution for that error type

## Getting Help

If none of the above solutions work:

1. **Check the console logs** - They now include detailed error messages
2. **Verify your setup:**
   ```bash
   # Check if tesseract.js is installed
   bun list | grep tesseract
   
   # Check if .env file exists
   ls -la .env
   
   # Check environment variables
   cat .env | grep OCR
   ```

3. **Test OCR.space API directly:**
   - Visit: https://ocr.space/ocrapi/freekey
   - Get a free API key
   - Test it in the browser console or Postman

4. **Report the issue** with:
   - Error message from console
   - Which OCR method failed (OCR.space, Tesseract, or both)
   - Your environment (web, iOS, Android)
   - Network status

## Recommended Setup for Production

1. **Get OCR.space API key** (free tier: 25,000 requests/month)
2. **Add to `.env` file:**
   ```
   EXPO_PUBLIC_OCR_SPACE_API_KEY=your_key_here
   ```
3. **Keep Tesseract.js as fallback** (already installed)
4. **Test thoroughly** before deploying

## Alternative Solutions

If OCR continues to fail:

1. **Use manual entry** - The app always allows manual entry as a fallback
2. **Try different OCR services:**
   - Google Cloud Vision API
   - AWS Textract
   - Azure Computer Vision
3. **Implement image preprocessing** - Enhance image quality before OCR

