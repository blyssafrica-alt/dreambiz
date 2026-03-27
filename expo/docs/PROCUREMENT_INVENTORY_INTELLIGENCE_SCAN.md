# Procurement + Inventory Intelligence — Repo Scan Summary

## 1. Products & Inventory (existing)

- **Table:** `public.products` (COMPLETE_SCHEMA.sql)
  - Columns: id, user_id, business_id, name, description, cost_price, selling_price, currency, quantity, category, is_active, created_at, updated_at
  - **Already added by supplier_po_inventory_integration.sql:** `default_supplier_id` (FK to supplier_marketplace_profiles)
  - **Missing for reorder/valuation:** reorder_level, reorder_quantity, last_cost_price, average_cost_price (we use cost_price as weighted avg today), last_purchase_date. Quantity is integer (add_decimal_quantity_support may have changed).
- **inventory_transactions** (supplier_po_inventory_integration.sql): business_id, product_id, supplier_id, purchase_order_id, quantity, unit_cost, total_cost, payment_method, created_at. Used for PO→inventory traceability.

## 2. POS & Sales (existing)

- **Sales flow:** POS uses `documents` (type='receipt', status='paid') with `items` JSONB; then `transactions` (type='sale', description like 'POS Sale - ...'). Product stock is decremented via `updateProduct(id, { quantity })`.
- **Document items:** Currently `{ id, description, quantity, unitPrice, total }` — **no product_id** stored. Cart has `item.product.id`; we can add optional `productId` to DocumentItem and pass it from POS so COGS can be linked.
- **No** dedicated pos_sales or receipt_line_items table; receipts are documents with JSONB items. Transaction does not store document_id (so we link by business_id + date + type='sale' or add document_id to transactions later).

## 3. Finances (existing)

- **transactions:** type IN ('sale','expense','inventory_purchase'); amount, category, date, business_id, user_id.
- **Balance sheet** (financial-tools/balance-sheet.tsx): Cash, AR, Inventory (products cost×qty), AP (documents + supplier_accounts_payable), equity. inventory_purchase already reduces cash; not expense.
- **Reports** (tabs/reports.tsx): P&L from transactions (sales vs expenses), category breakdowns, charts (LineChart, PieChart). No COGS / gross profit yet.

## 4. Reports & Charts (existing)

- **Reports screen:** `app/(tabs)/reports.tsx` — period filter, sales vs expenses, profit, category breakdown, charts. Uses `useBusiness()` (transactions, documents).
- **Charts:** `@/components/Charts` — LineChart, PieChart (and BarChart, GroupedBarChart used in my-ads). Reusable for supplier profit and inventory valuation.

## 5. Purchase Orders & Supplier (existing)

- **supplier_purchase_orders** (supplier_growth_procurement.sql): buyer_id (auth.users), supplier_id, status, total_amount, currency, inventory_added.
- **supplier_purchase_order_items:** product_id (marketplace product), quantity, unit_price.
- **Hooks:** useBuyerPurchaseOrders, useAddPOToInventory (RPC add_po_to_inventory). PO detail screen with "Add to inventory" modal.

## 6. Feature flags & permissions (existing)

- **FeatureContext:** reads `feature_config` (feature_id, enabled, category, is_premium, etc.). `isFeatureVisible(featureId)` used across app.
- **Employee permissions** (create_employee_roles_permissions.sql): products:view, products:create, products:edit, products:manage_stock; pos:view, pos:process_sales, etc. No explicit inventory:view / reports:view — use products:* and finances:view_reports.

## 7. Integration points (for implementation)

| Feature | Integration point |
|--------|---------------------|
| Product reorder fields | ALTER products ADD reorder_level, reorder_quantity, last_cost_price, average_cost_price, last_purchase_date; keep cost_price as main cost, sync average_cost_price on purchase. |
| inventory_movements | New table; write on purchase (add_po_to_inventory), sale (POS receipt paid), adjustment. |
| sales_cogs | New table; fill when receipt has items with product_id, using product.average_cost_price (or cost_price). Link sale to document_id (add document_id to transactions or use document id on sales_cogs). |
| Reorder suggestions | New tables reorder_suggestions, reorder_settings; RPC generate_reorder_suggestions(business_id). |
| One-tap reorder | RPC create_purchase_order_from_suggestion(suggestion_id); reuse existing PO create flow. |
| Supplier profit | View or RPC from inventory_transactions + products (default_supplier_id) + documents (receipts with product_id in items) + sales_cogs. |
| Supplier performance | New view supplier_performance_score; supplier_metrics_daily; RFQ/PO/complaints from existing tables. |
| Inventory valuation | Report from products (quantity × average_cost_price), category breakdown; slow-moving from sales velocity. |
| COGS in P&L | Reports + balance sheet: subtract COGS from revenue for gross profit; keep inventory_purchase out of expenses. |
| Feature flags | Insert feature_config rows for reorder-suggestions, one-tap-reorder, supplier-profit-report, inventory-valuation-report, supplier-performance-analytics, automated-cogs. |
| Permissions | Add inventory:view, inventory:edit, reports:view if not present; gate screens by feature + permission. |

## 8. Implementation order (as specified)

1. ✅ Scan (this doc)
2. DB migrations + RLS + RPC (products fields, inventory_movements, sales_cogs, reorder_*, supplier_metrics, views)
3. Reorder engine (generate_reorder_suggestions) + UI + one-tap PO
4. Reports: supplier profit + inventory valuation
5. Supplier performance score + badges
6. Bookkeeping: COGS on sale, P&L/balance sheet
7. Feature flags + permissions + routes
8. Testing checklist + seed data
