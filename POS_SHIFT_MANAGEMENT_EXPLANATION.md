# POS Shift Management - How It Works

## Current Flow

### 📍 **Shift Opening (Current Implementation)**

Currently, shifts are **automatically created** when:
1. User opens the **Day End Closing** screen (`pos-day-end.tsx`)
2. System checks if there's an open shift for today
3. If no open shift exists, it automatically creates one

**Opening Cash Logic:**
```typescript
// Gets the last closed shift's actual_cash or cash_at_hand
const lastShift = await supabase
  .from('pos_shifts')
  .select('actual_cash, cash_at_hand')
  .eq('business_id', business.id)
  .eq('status', 'closed')
  .order('shift_date', { ascending: false })
  .limit(1)
  .maybeSingle();

const openingCash = lastShift?.actual_cash || lastShift?.cash_at_hand || 0;
```

**New Shift is Created With:**
- `status: 'open'`
- `shift_date: today`
- `shift_start_time: NOW()`
- `opening_cash: [from last closed shift or 0]`
- `opened_by: [current user ID]`

---

### 🔒 **Shift Closing (Current Implementation)**

Shifts are closed when:
1. User enters **Actual Cash at Hand** in Day End Closing screen
2. User clicks **"Close Shift"** button
3. System:
   - Recalculates totals using `calculate_shift_totals()` function
   - Updates shift with:
     - `status: 'closed'`
     - `actual_cash: [entered amount]`
     - `cash_at_hand: [entered amount]`
     - `cash_discrepancy: [actual - expected]`
     - `shift_end_time: NOW()`
     - `closed_by: [current user ID]`

---

## ⚠️ **Current Limitations**

### Issue 1: Shift Not Created Before First Sale
**Problem:** If a user makes POS sales before visiting the Day End Closing screen, those sales might not be properly tracked because the shift doesn't exist yet.

**Current Behavior:**
- Sales are created as receipts in `documents` table
- But shift totals are calculated when closing, so sales made before shift creation are still counted
- However, it's not ideal - shift should exist before sales are made

### Issue 2: No Manual Shift Opening
**Problem:** Users can't manually start/end shifts. Shifts are automatically created when opening Day End screen.

**Current Behavior:**
- First person to open Day End screen creates the shift
- This might not match actual business operations (e.g., cashier starting their shift)

---

## ✅ **Recommended Improvements**

### Option 1: Auto-Create Shift on First POS Sale (Recommended)
When user makes first sale in POS screen, automatically check/create shift:

```typescript
// In app/(tabs)/pos.tsx handleCheckout function
const ensureShiftExists = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  // Check for existing open shift
  const { data: existingShift } = await supabase
    .from('pos_shifts')
    .select('id')
    .eq('business_id', business.id)
    .eq('shift_date', today)
    .eq('status', 'open')
    .maybeSingle();
  
  if (!existingShift) {
    // Create shift before processing sale
    await createNewShift();
  }
};

// Call before creating receipt
await ensureShiftExists();
```

### Option 2: Manual Shift Management
Add buttons in POS screen to:
- "Start Shift" - Opens shift and sets opening cash
- "End Shift" - Closes current shift
- Show shift status indicator in POS header

### Option 3: Automatic Shift Creation on App Start
When POS screen loads, automatically create shift if it doesn't exist.

---

## 📊 **How Totals Are Calculated**

The `calculate_shift_totals()` function:

1. **Gets shift date and business ID**
2. **Queries all receipts** for that business/date:
   ```sql
   SELECT 
     SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales,
     SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END) as card_sales,
     -- etc.
   FROM documents
   WHERE business_id = ? 
     AND date = shift_date
     AND type = 'receipt'
     AND status = 'paid'
   ```

3. **Updates shift with calculated totals:**
   - Total sales by payment method
   - Transaction counts
   - Discounts
   - Expected cash (opening + cash sales)

---

## 🎯 **Best Practice Implementation**

For a production-ready system, shifts should be:

1. **Created explicitly** - Either:
   - Auto-created on first sale of the day
   - Manual "Start Shift" button with opening cash entry
   
2. **Tracked consistently** - Every POS sale should be associated with the current shift

3. **Closed properly** - Only after all cash is counted and verified

4. **Auditable** - Record who opened/closed the shift and when

---

## 🔄 **Current Workflow**

```
1. Day Opens
   └─> User opens Day End Closing screen
       └─> System checks for open shift
           └─> If none: Creates new shift (status='open')
           └─> If exists: Loads existing shift

2. Sales Occur
   └─> User makes sales in POS screen
       └─> Receipts created (linked to date, not explicitly to shift)
       └─> Totals will be calculated when closing

3. Day Ends
   └─> User opens Day End Closing screen
       └─> Views current totals
       └─> Enters actual cash counted
       └─> Clicks "Close Shift"
           └─> System calculates all totals from receipts
           └─> Updates shift status to 'closed'
           └─> Records actual cash and discrepancy
```

---

## 💡 **Summary**

**Current System:**
- ✅ Shifts are created automatically when Day End screen opens
- ✅ Opening cash comes from last closed shift
- ✅ Totals are calculated from all receipts for that date
- ⚠️ Shift might not exist when first sale is made
- ⚠️ No explicit shift start/end workflow

**Recommended Enhancement:**
- Auto-create shift on first POS sale
- Or add manual "Start Shift" button
- Ensure shift exists before any sales are processed

