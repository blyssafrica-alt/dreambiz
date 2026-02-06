# How Ad Conversions Are Calculated

## Overview

Conversions track when a user completes a valuable action after clicking an ad. The system uses **attribution windows** to link conversions back to the ad that drove them.

## Conversion Events

Currently, conversions are tracked for two types of actions:

### 1. **Book Purchases** (`app/books/[id].tsx`)
- **When**: User purchases a book after clicking an ad
- **Conversion Value**: The book's price
- **Attribution**: Uses `consumeLastAdClick()` to find the most recent ad click within the attribution window

```typescript
// When user purchases a book
if (attribution) {
  await trackConversion(attribution.adId, attribution.location, price);
}
```

### 2. **Product Purchases** (`contexts/ProductContext.tsx`)
- **When**: User purchases a platform product after clicking an ad
- **Conversion Value**: Total purchase price (unit price × quantity)
- **Attribution**: Uses `consumeLastAdClick()` to find the most recent ad click

```typescript
// When user purchases a product
if (attribution) {
  await trackConversion(attribution.adId, attribution.location, totalPrice);
}
```

## Attribution Windows

The system uses **configurable attribution windows** from ad sets to determine if a conversion should be attributed to an ad:

### Click Attribution Window
- **Default**: 7 days
- **Configurable**: Set via `ad_sets.attribution_click_days`
- **Logic**: If a user clicks an ad, any conversion within this window is attributed to that ad

### View Attribution Window  
- **Default**: 1 day
- **Configurable**: Set via `ad_sets.attribution_view_days`
- **Logic**: If a user views an ad (but doesn't click), any conversion within this window is attributed to that ad

### Priority
1. **Click attribution** takes priority over view attribution
2. If both windows are valid, the click is used
3. Only the **most recent** click/view within the window is used

## How `trackConversion` Works

```typescript
trackConversion(adId: string, location: string, value?: number)
```

### Process:
1. **Finds the most recent impression** for the ad in the current session
2. **Updates the impression** to mark it as converted:
   - Sets `converted = true`
   - Sets `converted_at` timestamp
   - Stores `conversion_value` (revenue amount)
3. **If no impression exists**, creates a new one with both `clicked` and `converted` set to true

### Database Update:
```sql
UPDATE ad_impressions
SET 
  converted = true,
  converted_at = NOW(),
  conversion_value = value
WHERE id = impression_id;
```

## Database Trigger Calculation

When an impression is updated with `converted = true`, the trigger automatically:

### 1. **Increments Conversion Count**
```sql
conversions_count = conversions_count + 1
```

### 2. **Adds Revenue**
```sql
revenue = revenue + conversion_value
```

### 3. **Calculates Spend** (for CPA billing)
- **CPA (Cost Per Acquisition)**: Charges `billing_rate` when conversion happens
- **CPE (Cost Per Engagement)**: Charges `billing_rate` if conversion happens without a prior click
- **CPC (Cost Per Click)**: No charge on conversion (only on click)

```sql
cost_to_add = CASE
  WHEN billing_type = 'cpa' AND converted = true THEN billing_rate
  WHEN billing_type = 'cpe' AND converted = true AND clicked = false THEN billing_rate
  ELSE 0
END
```

## Conversion Metrics

### Conversion Rate (CVR)
```
CVR = (conversions_count / clicks_count) × 100
```

### Revenue Per Conversion
```
RPC = revenue / conversions_count
```

### Cost Per Acquisition (CPA)
```
CPA = spend_actual / conversions_count
```

## Example Flow

1. **User sees ad** → Impression tracked (`viewed_at` recorded)
2. **User clicks ad** → Click tracked (`clicked = true`, `clicked_at` recorded)
3. **User purchases book** (within 7 days) → Conversion tracked:
   - `converted = true`
   - `converted_at` recorded
   - `conversion_value = $29.99` (book price)
   - `conversions_count` incremented by 1
   - `revenue` increased by $29.99
   - If billing is **CPA**: `spend_actual` increased by `billing_rate`

## Adding New Conversion Events

To track conversions for new actions:

1. **Get attribution** from the last ad click:
```typescript
const { consumeLastAdClick } = useAds();
const attribution = consumeLastAdClick();
```

2. **Call trackConversion** when the action completes:
```typescript
if (attribution) {
  await trackConversion(
    attribution.adId, 
    attribution.location, 
    conversionValue // optional: revenue amount
  );
}
```

## Attribution Window Configuration

Ad sets can configure attribution windows:

- **`attribution_click_days`**: Days to attribute conversions after a click (default: 7)
- **`attribution_view_days`**: Days to attribute conversions after a view (default: 1)

These are set in the Ad Sets admin screen and affect how conversions are attributed to ads.

## Notes

- **One conversion per impression**: Each impression can only be converted once
- **Session-based**: Conversions are linked to impressions in the same session
- **Revenue tracking**: Conversion value is stored for revenue reporting
- **Billing impact**: Conversions affect spend for CPA and CPE billing types


