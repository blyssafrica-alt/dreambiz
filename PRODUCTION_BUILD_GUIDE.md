# Production Build Guide - DreamBiz

## Prerequisites

1. **Install EAS CLI** (if not already installed):
```bash
npm install -g eas-cli
```

2. **Login to Expo/EAS**:
```bash
eas login
```

3. **Verify EAS is configured**:
```bash
eas whoami
```

---

## Production Build Commands

### Build for iOS (Production)
```bash
npm run build:ios
```
or
```bash
eas build --platform ios --profile production
```

### Build for Android (Production)
```bash
npm run build:android
```
or
```bash
eas build --platform android --profile production
```

### Build for Both Platforms
```bash
npm run build:all
```
or
```bash
eas build --platform all --profile production
```

---

## Build Options

### Build Locally (Faster, requires local setup)
```bash
# iOS
eas build --platform ios --profile production --local

# Android
eas build --platform android --profile production --local
```

### Build on EAS Servers (Cloud Build - Recommended)
```bash
# Just use the commands above without --local flag
eas build --platform ios --profile production
```

---

## Submit to App Stores

### Submit iOS to App Store
```bash
npm run submit:ios
```
or
```bash
eas submit --platform ios --profile production
```

### Submit Android to Google Play
```bash
npm run submit:android
```
or
```bash
eas submit --platform android --profile production
```

**Note:** Make sure to update `eas.json` with your Apple ID and Google Play service account credentials before submitting.

---

## Running Production Build Locally

### For iOS Simulator/Device
1. Build the app:
```bash
eas build --platform ios --profile production --local
```

2. Install on device:
   - iOS: Use Xcode to install the `.ipa` file
   - Or use TestFlight for distribution

### For Android Device
1. Build the app:
```bash
eas build --platform android --profile production --local
```

2. Install the APK:
```bash
# Connect your Android device via USB
adb install path/to/your-app.apk
```

---

## Quick Production Workflow

### Complete Production Release (Both Platforms)
```bash
# 1. Build for both platforms
npm run build:all

# 2. Wait for builds to complete (check EAS dashboard)

# 3. Submit to stores
npm run submit:ios
npm run submit:android
```

---

## Environment Variables

Production environment variables are already configured in `eas.json`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OCR_SPACE_API_KEY`

---

## Build Status & Downloads

After starting a build, you can:
- Check status: `eas build:list`
- View build details: Visit https://expo.dev/accounts/[your-account]/projects/dreambiz/builds
- Download builds from the EAS dashboard

---

## Troubleshooting

### If build fails:
```bash
# Check build logs
eas build:list

# View specific build details
eas build:view [build-id]
```

### Clear cache and rebuild:
```bash
eas build --platform ios --profile production --clear-cache
```

### Update EAS CLI:
```bash
npm install -g eas-cli@latest
```

---

## Pre-build Steps (if needed)

If you need to generate native code:
```bash
npm run prebuild
```

This runs `expo prebuild --clean` to generate iOS and Android folders.

---

## Notes

- **Build time**: Cloud builds typically take 10-20 minutes
- **Build limits**: Free tier has build limits, check your EAS plan
- **Versioning**: Production builds auto-increment build numbers (configured in `eas.json`)
- **Distribution**: Production builds create APK (Android) and IPA (iOS) files

