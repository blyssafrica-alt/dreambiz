# Currency Onyx Edge Function

This Edge Function provides currency exchange rate data and conversion services.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy currency-onyx
   ```

2. **Environment Variables:**
   - Automatically available: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - No additional configuration needed

## Usage

### Get Exchange Rate

```typescript
import { invokeEdgeFunction } from '@/lib/edge-function-helper';

const { data, error } = await invokeEdgeFunction('currency-onyx', {
  body: {},
});

if (data) {
  console.log('USD to ZWL:', data.exchangeRate);
}
```

### Convert Currency

```typescript
const { data, error } = await invokeEdgeFunction('currency-onyx', {
  body: {
    from: 'USD',
    to: 'ZWL',
    amount: 100,
  },
});

if (data?.conversion) {
  console.log(`${data.conversion.originalAmount} ${data.conversion.from} = ${data.conversion.convertedAmount} ${data.conversion.to}`);
}
```

## Authentication

The function:
- **Accepts authenticated users** - Uses user's exchange rate from database if available
- **Works without auth** - Falls back to default exchange rate (25000 ZWL/USD)
- **Automatically includes auth headers** when called via `invokeEdgeFunction` helper

## Response Format

**Success:**
```json
{
  "success": true,
  "data": {
    "exchangeRate": 25000,
    "exchangeRateDate": "2024-01-01T00:00:00Z",
    "conversion": {
      "from": "USD",
      "to": "ZWL",
      "originalAmount": 100,
      "convertedAmount": 2500000.00
    }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

