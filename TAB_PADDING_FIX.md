# Tab Bar Content Padding Fix

## Issue
Content is being hidden by the elevated tab bar on various screens.

## Solution
Add proper bottom padding to all ScrollView contentContainerStyle props.

### Required Padding Values
- **iOS**: 120px (tab bar height 100px + extra spacing)
- **Android**: 110px (tab bar height 90px + extra spacing)

### Implementation Pattern
```tsx
<ScrollView
  style={styles.content}
  contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 110 }}
  showsVerticalScrollIndicator={false}
>
```

## Files Fixed
- ✅ app/(tabs)/payments.tsx
- ✅ app/(tabs)/pos.tsx (special handling for cart button at bottom: cartButtonBottom + 10)
- ✅ app/(tabs)/index.tsx (dashboard)
- ✅ app/(tabs)/finances.tsx
- ✅ app/(tabs)/documents.tsx  
- ✅ app/(tabs)/products.tsx
- ✅ app/(tabs)/more.tsx

## Tab Bar Configuration
From `app/(tabs)/_layout.tsx`:
- **iOS tab bar height**: 100px
- **Android tab bar height**: 90px
- **Tab bar bottom padding (iOS)**: Math.max(34, insets.bottom + 10)
- **Tab bar bottom padding (Android)**: Math.max(40, insets.bottom + 20)

## Notes
- The POS screen has special handling because it has a floating cart button that needs to be positioned above the tab bar
- All ScrollView components with bottom content should use the consistent padding pattern
- FAB buttons should be positioned at `Platform.OS === 'ios' ? 100 : 80` from bottom
