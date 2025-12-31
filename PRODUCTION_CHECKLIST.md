# ✅ Production Build Checklist

## Pre-Build Verification

### 1. Configuration Files ✓
- [x] `app.json` - Updated with production settings
- [x] `package.json` - Build scripts added
- [x] `eas.json` - EAS build configuration created
- [x] `tsconfig.json` - TypeScript configuration verified
- [x] `babel.config.js` - Babel configuration verified
- [x] `metro.config.js` - Metro bundler configuration verified

### 2. Environment Variables
- [x] Supabase URL configured in `app.json`
- [x] Supabase Anon Key configured in `app.json`
- [x] `.env.example` file exists for reference
- [ ] EAS secrets configured (if using EAS Build)

### 3. App Metadata
- [x] App name: "DreamBig Business OS"
- [x] Bundle identifier (iOS): `app.dreambiz.com`
- [x] Package name (Android): `app.dreambiz.com`
- [x] Version: `1.0.0`
- [x] Build number (iOS): `1`
- [x] Version code (Android): `1`

### 4. Assets
- [ ] Icon: `./assets/images/icon.png` (1024x1024px)
- [ ] Adaptive icon: `./assets/images/adaptive-icon.png` (1024x1024px)
- [ ] Splash screen: `./assets/images/splash-icon.png`
- [ ] Favicon: `./assets/images/favicon.png` (for web)

### 5. Permissions
- [x] iOS permissions configured (Camera, Photo Library, Microphone)
- [x] Android permissions configured (Camera, Storage, Internet)
- [x] Permission descriptions added

### 6. Plugins
- [x] expo-router configured
- [x] expo-font configured
- [x] expo-image-picker configured
- [x] expo-print configured
- [x] expo-web-browser configured

### 7. Code Quality
- [ ] Run `npm run lint` - No errors
- [ ] Run `npx tsc --noEmit` - No TypeScript errors
- [ ] All console.log statements removed or wrapped in development checks
- [ ] Error handling implemented for all API calls

### 8. Testing
- [ ] Test on iOS device/simulator
- [ ] Test on Android device/emulator
- [ ] Test all major features:
  - [ ] Authentication (sign up, sign in)
  - [ ] Business profile creation
  - [ ] POS functionality
  - [ ] Document creation
  - [ ] PDF export
  - [ ] Receipt scanning
  - [ ] Integrations

### 9. Database
- [ ] All database migrations run
- [ ] RLS policies verified
- [ ] Super admin account created
- [ ] Test data cleaned up (if any)

### 10. Security
- [ ] API keys not hardcoded (use environment variables)
- [ ] Sensitive data encrypted
- [ ] RLS policies tested
- [ ] Authentication flow tested

## Build Commands

### Development Build
```bash
npm start
```

### Production Build (EAS)
```bash
# iOS
npm run build:ios

# Android
npm run build:android

# Both
npm run build:all
```

### Local Build
```bash
# Prebuild
npm run prebuild

# iOS (requires macOS)
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release
```

## Post-Build

### Before Submission
- [ ] Test the built app thoroughly
- [ ] Verify all features work
- [ ] Check app performance
- [ ] Review app store listings
- [ ] Prepare screenshots and descriptions

### App Store Submission
- [ ] iOS: App Store Connect setup
- [ ] Android: Google Play Console setup
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support email
- [ ] App screenshots (all required sizes)
- [ ] App description and keywords

## Notes

- Update version numbers before each release
- Increment build numbers for each build
- Keep changelog updated
- Test on real devices before submission

