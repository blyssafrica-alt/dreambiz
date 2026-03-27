# Ad Placement Best Practices

## Facebook's Approach

Facebook uses a **feed-based native advertising** strategy:

1. **Spacing**: 1 ad per 3-5 organic posts (not consecutive)
2. **No consecutive ads**: Never show multiple ads in a row
3. **Clear labeling**: All ads are marked as "Sponsored"
4. **Native format**: Ads blend with content but are clearly distinguishable
5. **User experience**: Ads feel like part of the feed, not intrusive

## Current Implementation Issues

### Problem: Multiple Ads Can Show in a Row

Currently, if multiple ads are available for a location, they can display consecutively:

```typescript
// Current: Shows ad after every 5 items
{index % 5 === 0 && <AdCard ad={ads[0]} />}
{index % 5 === 0 && <AdCard ad={ads[1]} />} // Could show right after!
```

### Problems with Consecutive Ads:
- ❌ **Poor UX**: Feels spammy and intrusive
- ❌ **Lower engagement**: Users scroll past multiple ads
- ❌ **Ad blindness**: Users learn to ignore ad-heavy sections
- ❌ **Reduced revenue**: Lower CTR when ads are bunched together

## Recommended Solution

### 1. **Enforce Minimum Spacing**
- Minimum 3-5 content items between ads
- Never show ads consecutively
- Track last ad position to prevent stacking

### 2. **Limit Ads Per Screen**
- Maximum 1-2 ads visible at once (above the fold)
- Use pagination/virtualization to control density

### 3. **Smart Rotation**
- Rotate through available ads
- Use priority and performance metrics
- Ensure variety (don't show same ad twice in a row)

### 4. **Clear Labeling**
- Always mark ads as "Sponsored" or "Ad"
- Use visual distinction (border, background color)
- Make it clear but not intrusive

## Implementation Strategy

### Option A: Minimum Gap Enforcement
```typescript
let lastAdIndex = -1;
const MIN_AD_GAP = 5; // Minimum items between ads

{items.map((item, index) => (
  <>
    <ItemComponent item={item} />
    {shouldShowAd(index) && (index - lastAdIndex) >= MIN_AD_GAP && (
      <AdCard ad={getNextAd()} />
      {lastAdIndex = index}
    )}
  </>
))}
```

### Option B: Percentage-Based Placement
```typescript
// Show ad at 20% and 60% of content (roughly 1 ad per 3-4 items)
const adPositions = [
  Math.floor(items.length * 0.2),
  Math.floor(items.length * 0.6)
];

{items.map((item, index) => (
  <>
    <ItemComponent item={item} />
    {adPositions.includes(index) && <AdCard ad={getNextAd()} />}
  </>
))}
```

### Option C: Priority-Based with Spacing
```typescript
// Use existing priority system but enforce spacing
const adsForLocation = getAdsForLocation(location);
let adIndex = 0;
let lastAdPosition = -10; // Start negative to allow first ad

{items.map((item, index) => {
  const shouldShow = 
    adsForLocation.length > 0 &&
    (index - lastAdPosition) >= MIN_AD_GAP &&
    adIndex < adsForLocation.length;
  
  if (shouldShow) {
    lastAdPosition = index;
    adIndex++;
  }
  
  return (
    <>
      <ItemComponent item={item} />
      {shouldShow && <AdCard ad={adsForLocation[adIndex - 1]} />}
    </>
  );
})}
```

## Recommended Settings

- **Minimum gap**: 5 items between ads
- **Max ads per screen**: 2-3 ads maximum
- **Ad frequency**: 1 ad per 4-5 content items
- **Rotation**: Cycle through available ads
- **Priority**: Higher priority ads shown first, but still spaced

## Benefits

✅ **Better UX**: Feels natural, not spammy
✅ **Higher engagement**: Users don't skip ad-heavy sections
✅ **Better performance**: Higher CTR when ads are well-spaced
✅ **More revenue**: Better user experience = more ad views
✅ **Professional**: Matches industry standards (Facebook, Instagram, Twitter)

