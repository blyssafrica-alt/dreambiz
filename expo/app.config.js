export default {
  expo: {
    name: 'DreamBiz',
    slug: 'dreambiz',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'dreambiz',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      // Match LoadingScreen design - using starting color of gradient for seamless transition
      backgroundColor: '#FFFFFF', // White to match LoadingScreen gradient start color
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'app.dreambiz.com',
      buildNumber: '1',
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          'Allow $(PRODUCT_NAME) to access your photos to upload product images and receipts',
        NSCameraUsageDescription:
          'Allow $(PRODUCT_NAME) to access your camera to scan receipts and capture product images',
        NSMicrophoneUsageDescription:
          'Allow $(PRODUCT_NAME) to access your microphone for voice notes',
      },
      usesIcloudStorage: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'app.dreambiz.com',
      versionCode: 14,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.RECORD_AUDIO',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'INTERNET',
      ],
    },
    web: {
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-web-browser',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to upload product images and scan receipts.',
        },
      ],
      [
        'expo-document-picker',
        {
          iCloudContainerEnvironment: 'Production',
        },
      ],
      // Only include Sentry plugin if org and project are configured
      ...(process.env.EXPO_PUBLIC_SENTRY_ORG && process.env.EXPO_PUBLIC_SENTRY_PROJECT
        ? [
            [
              '@sentry/react-native/expo',
              {
                organization: process.env.EXPO_PUBLIC_SENTRY_ORG,
                project: process.env.EXPO_PUBLIC_SENTRY_PROJECT,
                url: process.env.EXPO_PUBLIC_SENTRY_URL || 'https://sentry.io/',
              },
            ],
          ]
        : []),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: 'https://oqcgerfjjiozltkmmkxf.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp',
      EXPO_PUBLIC_OCR_SPACE_API_KEY: 'K82828017188957',
      // Monitoring configuration (from environment variables, with fallbacks)
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://ddcc3b51c7eddd52998ae5bafac64081@o4510641613504512.ingest.de.sentry.io/4510641637163088',
      posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 'phc_nJp7XKtyWcArFPz0Kko7dOfq5MrKpEyMIIChHrGKsg1',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Sentry configuration
      sentryOrg: process.env.EXPO_PUBLIC_SENTRY_ORG,
      sentryProject: process.env.EXPO_PUBLIC_SENTRY_PROJECT,
      sentryUrl: process.env.EXPO_PUBLIC_SENTRY_URL || 'https://sentry.io/',
      router: {},
      // EAS project ID – from .env or this linked project (set by build:configure).
      eas: {
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || '35f473cd-d058-4127-9c33-fddb7f68d2f6',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};

