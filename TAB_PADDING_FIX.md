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

## Files Already Fixed
- ✅ app/(tabs)/payments.tsx
- ✅ app/(tabs)/pos.tsx (special handling for cart button)
- ✅ app/(tabs)/index.tsx (dashboard)

## Files That Need Fixing
All other tab screens with ScrollView components.
