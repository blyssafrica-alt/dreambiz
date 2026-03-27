# Why "Delete product" can fail (violation)

## What happens

When a supplier tries to **delete** a product from the marketplace, the request can fail with a **foreign key constraint violation** (PostgreSQL error about `supplier_purchase_order_items` or "violates foreign key constraint").

## Cause

The table **`supplier_purchase_order_items`** stores line items for purchase orders. Each row has:

- `product_id` → references `supplier_marketplace_products(id)` with **`ON DELETE RESTRICT`**

So:

- If the product has **never** been on any purchase order → delete works.
- If the product **has** been added to at least one purchase order line → PostgreSQL blocks the delete to keep order history consistent.

That’s why the same product might be deletable before any orders and not deletable after it appears in an order.

## Options

1. **Allow delete and keep order lines (recommended)**  
   Change the foreign key so that when a product is deleted, `product_id` on those line items is set to `NULL` (order line stays; link to product is removed).  
   → Use the migration in `database/supplier_product_delete_allow.sql`.

2. **Keep current behaviour and improve UX**  
   Keep `ON DELETE RESTRICT`. In the app, when delete fails with a foreign key error, show a message like: *"This product can't be deleted because it appears in purchase orders. You can unpublish it to hide it from your store."*  
   → The app already shows a clearer message when this violation is detected.

3. **Soft delete**  
   Don’t actually delete the row; add a `deleted_at` (or similar) and filter it out everywhere. No FK change needed; "delete" just sets the flag.

## Summary

| Situation | Result |
|----------|--------|
| Product not on any PO | Delete succeeds. |
| Product on at least one PO line | Delete fails with FK violation until you run the migration (or use unpublish / soft delete). |

After applying `supplier_product_delete_allow.sql`, deletes will succeed and PO lines will keep quantity/price but have `product_id = NULL` for the removed product.
