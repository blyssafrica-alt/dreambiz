# 🚀 DreamBig Business OS - Build Guide

## Prerequisites

1. **Expo CLI** (if not using EAS)
   ```bash
   npm install -g expo-cli
   ```

2. **EAS CLI** (for cloud builds)
   ```bash
   npm install -g eas-cli
   ```

3. **Expo Account**
   - Sign up at [expo.dev](https://expo.dev)
   - Login: `eas login`

## 📱 Building for Production

### Option 1: EAS Build (Recommended)

EAS Build is the recommended way to build production apps.

#### Setup EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

#### Build Commands

```bash
# Build for iOS
npm run build:ios
# or
eas build --platform ios --profile production

# Build for Android
npm run build:android
# or
eas build --platform android --profile production

# Build for both platforms
npm run build:all
# or
eas build --platform all --profile production
```

#### Build Profiles

- **development**: For development builds with Expo Go
- **preview**: For internal testing (APK/IPA)
- **production**: For App Store/Play Store submission

### Option 2: Local Builds

#### iOS (requires macOS)

```bash
# Install dependencies
npm install

# Prebuild native code
npm run prebuild

# Build for iOS
cd ios
pod install
cd ..
npx expo run:ios --configuration Release
```

#### Android

```bash
# Install dependencies
npm install

# Prebuild native code
npm run prebuild

# Build for Android
npx expo run:android --variant release
```

## 📦 App Store Submission

### iOS (App Store)

1. **Build the app:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store:**
   ```bash
   eas submit --platform ios --profile production
   ```

3. **Or manually:**
   - Download the `.ipa` from EAS
   - Use Transporter app or Xcode to upload

### Android (Google Play Store)

1. **Build the app:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Submit to Play Store:**
   ```bash
   eas submit --platform android --profile production
   ```

3. **Or manually:**
   - Download the `.aab` from EAS
   - Upload to Google Play Console

## 🔧 Configuration Files

### app.json
- App name, version, bundle identifiers
- Icons, splash screens
- Permissions and plugins
- Environment variables

### eas.json
- Build profiles (development, preview, production)
- Platform-specific settings
- Environment variables for builds

### package.json
- Dependencies
- Build scripts
- Version information

## 📝 Environment Variables

Environment variables are configured in:
1. **app.json** → `extra` section (for builds)
2. **.env** file (for local development)
3. **EAS Secrets** (for cloud builds)

### Setting EAS Secrets

```bash
# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"

# Set Supabase Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

## ✅ Pre-Build Checklist

- [ ] Update version in `app.json`
- [ ] Update build number (iOS) / version code (Android)
- [ ] Verify all environment variables are set
- [ ] Test app in development mode
- [ ] Run `npm run lint` to check for errors
- [ ] Verify all assets (icons, splash screens) exist
- [ ] Check bundle identifiers match your developer accounts
- [ ] Review permissions in `app.json`

## 🐛 Troubleshooting

### Build Fails

1. **Clear cache:**
   ```bash
   expo start --clear
   ```

2. **Clean build:**
   ```bash
   npm run prebuild -- --clean
   ```

3. **Check logs:**
   ```bash
   eas build:list
   eas build:view [build-id]
   ```

### Missing Dependencies

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Icon/Splash Issues

- Ensure icons are in `assets/images/`
- Check file formats (PNG for icons)
- Verify sizes:
  - Icon: 1024x1024px
  - Adaptive icon: 1024x1024px
  - Splash: 1242x2436px (or appropriate size)

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Expo App Configuration](https://docs.expo.dev/versions/latest/config/app/)

