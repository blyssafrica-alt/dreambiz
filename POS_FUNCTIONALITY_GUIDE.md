# 🛒 POS System - Complete Functionality Guide

## How the POS System Works

### Overview
The Point of Sale (POS) system is designed for retail businesses to quickly process sales, manage inventory, and generate receipts. It provides a modern, mobile-first interface optimized for fast checkout.

---

## Core Functionality

### 1. **Product Selection**

#### Product Display:
- **Grid Layout**: Products displayed in a 2-column grid for easy scanning
- **Product Cards**: Each card shows:
  - Product name
  - Selling price
  - Stock quantity (color-coded badge)
  - Quick add button (+)

#### Stock Indicators:
- 🟢 **Green Badge**: In Stock (10+ units)
- 🟡 **Yellow Badge**: Low Stock (1-9 units)
- 🔴 **Red Badge**: Out of Stock (0 units)

#### Search & Filter:
- **Search Bar**: Search products by name or category
- **Category Filter**: Horizontal scrollable chips to filter by category
- **Real-time Filtering**: Results update as you type

#### Adding to Cart:
- **Quick Add**: Tap product card or "+" button to add 1 unit
- **Stock Validation**: Prevents adding more than available stock
- **Auto-Open Cart**: Cart automatically opens when first item is added

---

### 2. **Cart Management**

#### Bottom Sheet Design:
- **Slide-Up Animation**: Cart slides up from bottom (85% of screen height)
- **Floating Cart Button**: Shows item count and total when cart is closed
- **Swipe to Close**: Tap outside or close button to dismiss

#### Cart Features:
- **Item Display**: Shows product name, price, quantity, and line total
- **Quantity Controls**: Large +/- buttons to adjust quantity
- **Remove Item**: X button to remove item from cart
- **Clear Cart**: Trash icon to clear all items (with confirmation)

#### Cart Summary:
- **Subtotal**: Sum of all line items
- **Discount**: Applied discount (if any)
- **Tax**: Tax amount (if applicable)
- **Grand Total**: Final amount to pay

---

### 3. **Customer Management**

#### Customer Selection:
- **Quick Select**: Tap customer section to open selection modal
- **Existing Customers**: List of all saved customers
- **Walk-in Customer**: Default option for customers without account
- **Customer Info**: Shows name and phone number

#### Add New Customer:
- **Quick Add**: Modal allows adding customer on-the-fly
- **Required Fields**: Customer name (required)
- **Optional Fields**: Phone number
- **Instant Use**: New customer immediately available for selection

---

### 4. **Discount System**

#### Discount Types:
- **Percentage Discount**: Apply discount as percentage (e.g., 10%)
- **Fixed Amount**: Apply fixed discount amount (e.g., $5.00)

#### How to Apply:
1. Tap "Apply Discount" in cart
2. Select discount type (Percentage or Fixed)
3. Enter discount value
4. Discount automatically calculated and displayed

#### Discount Display:
- Shows in cart summary as negative amount
- Subtracted from subtotal before tax
- Can be removed by clearing discount field

---

### 5. **Payment Processing**

#### Payment Methods:
- 💵 **Cash**: Physical cash payment
- 💳 **Card**: Credit/debit card payment
- 📱 **Mobile Money**: Mobile money transfer (Ecocash, OneMoney, etc.)
- 🏦 **Bank Transfer**: Bank transfer payment

#### Cash Payment Flow:
1. Select "Cash" payment method
2. Enter amount received
3. System calculates change automatically
4. Shows change amount in green
5. Validates sufficient payment before checkout

#### Other Payment Methods:
- No amount input required
- Payment assumed complete
- Receipt generated immediately

#### Payment Validation:
- **Cash**: Must enter amount ≥ total
- **Other Methods**: No validation needed
- **Error Messages**: Clear feedback if payment insufficient

---

### 6. **Checkout Process**

#### Pre-Checkout Validation:
- ✅ Cart not empty
- ✅ Customer selected or name entered
- ✅ Payment method selected
- ✅ Sufficient payment (for cash)

#### Checkout Steps:
1. **Review Cart**: Confirm all items and totals
2. **Select Customer**: Choose or add customer
3. **Apply Discount** (optional): Add discount if needed
4. **Proceed to Payment**: Tap "Proceed to Payment" button
5. **Select Payment Method**: Choose payment type
6. **Enter Amount** (cash only): Enter amount received
7. **Complete Payment**: Tap "Complete Payment"

#### What Happens on Checkout:
1. **Stock Update**: Product quantities automatically reduced
2. **Document Creation**: Receipt/invoice created in system
3. **Payment Recorded**: Payment method saved
4. **Success Message**: Shows total, payment method, and change
5. **Cart Cleared**: Ready for next sale

---

### 7. **Stock Management**

#### Automatic Stock Updates:
- **On Sale**: Stock automatically reduced when sale completes
- **Real-time Validation**: Prevents overselling
- **Stock Warnings**: Alerts when trying to add more than available

#### Stock Display:
- **Product Cards**: Show current stock quantity
- **Color Coding**: Visual indicators for stock levels
- **Out of Stock**: Products with 0 stock still visible but can't be added

---

### 8. **Receipt Generation**

#### Automatic Receipt:
- **Type**: Creates "Receipt" document (not invoice)
- **Status**: Automatically marked as "Paid"
- **Payment Method**: Saved in document
- **Discount Notes**: Included in document notes if applied

#### Receipt Details:
- Document number (REC-0001, etc.)
- Customer information
- All items with quantities and prices
- Subtotal, discount, tax, total
- Payment method
- Date and time

---

## User Interface Design

### Mobile-First Approach:
- **Full-Screen Products**: Products take full width when cart closed
- **Bottom Sheet Cart**: Cart slides up from bottom (like modern POS apps)
- **Large Touch Targets**: All buttons minimum 48x48px
- **Swipe Gestures**: Natural mobile interactions

### Visual Hierarchy:
- **Product Grid**: Easy to scan products quickly
- **Prominent Totals**: Large, clear total display
- **Color Coding**: Green (success), Blue (primary), Red (danger)
- **Icons**: Lucide icons for all actions

### Responsive Design:
- **Adaptive Layout**: Works on all screen sizes
- **Safe Areas**: Respects device notches and home indicators
- **Keyboard Handling**: Proper keyboard avoidance

---

## Business Logic

### Stock Validation:
```
IF product.quantity < requested_quantity:
    SHOW error: "Insufficient Stock"
    PREVENT adding to cart
ELSE:
    ALLOW adding to cart
```

### Discount Calculation:
```
IF discount_type == 'percent':
    discount_amount = (subtotal × discount_percentage) / 100
ELSE:
    discount_amount = min(discount_fixed, subtotal)

total = subtotal - discount_amount + tax
```

### Change Calculation:
```
IF payment_method == 'cash':
    change = amount_received - total
    IF change < 0:
        SHOW error: "Insufficient payment"
    ELSE:
        SHOW change amount
```

### Stock Update:
```
FOR each item in cart:
    new_stock = product.quantity - item.quantity
    UPDATE product SET quantity = new_stock
```

---

## Error Handling

### Validation Errors:
- **Empty Cart**: "Please add products to cart"
- **No Customer**: "Please select or enter customer name"
- **Insufficient Payment**: "Amount received is less than total"
- **Insufficient Stock**: "Only X units available"

### User Feedback:
- **Success Messages**: Clear confirmation after sale
- **Error Alerts**: Descriptive error messages
- **Loading States**: Visual feedback during processing

---

## Future Enhancements

### Planned Features:
1. **Barcode Scanning**: Scan product barcodes for quick add
2. **Receipt Printing**: Direct print to receipt printer
3. **Email Receipt**: Send receipt to customer email
4. **Sales History**: Quick access to recent sales
5. **Tax Configuration**: Business-level tax rate settings
6. **Multi-Currency**: Support for multiple currencies
7. **Loyalty Points**: Track and apply loyalty points
8. **Promotions**: Apply automatic promotions/discounts

---

## Best Practices

### For Cashiers:
1. **Scan Products**: Use search for quick product lookup
2. **Check Stock**: Verify stock levels before adding
3. **Confirm Customer**: Always select or enter customer
4. **Verify Payment**: Double-check amount received (cash)
5. **Review Totals**: Confirm all items and totals before checkout

### For Managers:
1. **Monitor Stock**: Check stock levels regularly
2. **Review Sales**: Check sales history for trends
3. **Update Products**: Keep product prices and stock current
4. **Train Staff**: Ensure staff understand all features

---

## Technical Details

### State Management:
- Cart items stored in component state
- Customer selection persisted during session
- Payment method and amounts in state
- Stock updates via BusinessContext

### Data Flow:
```
User Action → State Update → UI Update → Validation → API Call → Success/Error
```

### Performance:
- **Memoized Calculations**: Totals calculated only when needed
- **Optimized Renders**: Products filtered efficiently
- **Smooth Animations**: Native driver for animations

---

## Troubleshooting

### Common Issues:

**Cart won't open:**
- Check if cart has items
- Verify animation state

**Stock not updating:**
- Check product update permissions
- Verify network connection

**Payment validation fails:**
- Ensure amount received ≥ total (cash)
- Check payment method selected

**Customer not saving:**
- Verify customer name entered
- Check BusinessContext permissions

---

This POS system is designed to be fast, intuitive, and reliable for daily retail operations.

