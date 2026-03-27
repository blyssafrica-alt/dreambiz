# Procurement + Inventory Intelligence — Testing Checklist

## Database (run in order)

- [ ] **procurement_inventory_intelligence.sql**
  - Products: reorder_level, reorder_quantity, last_cost_price, average_cost_price, last_purchase_date
  - inventory_movements, sales_cogs, supplier_metrics_daily, reorder_settings, reorder_suggestions
  - RLS on all new tables
  - feature_config: reorder-suggestions, one-tap-reorder, supplier-profit-report, inventory-valuation-report, supplier-performance-analytics, automated-cogs
  - RPCs: generate_reorder_suggestions, create_purchase_order_from_suggestion
- [ ] **procurement_cogs_and_movements.sql**
  - transactions.document_id (if not exists)
  - record_sale_cogs RPC
  - Trigger on inventory_transactions → inventory_movements + products.last_cost_price/last_purchase_date
- [ ] **procurement_reports_rpc.sql**
  - get_pnl_summary (P&L with COGS)
  - get_supplier_profit_summary (for Supplier profit report)

## Feature flags

- [ ] feature_config rows exist; categories include 'inventory' and 'analytics'
- [ ] More → "Reorder suggestions" visible when reorder-suggestions is enabled

## Reorder suggestions

- [ ] Set products.reorder_level (e.g. 5) and products.reorder_quantity (e.g. 10) for a product; set quantity &lt;= reorder_level
- [ ] Open Reorder suggestions → Refresh suggestions → suggestion appears with reason "Low stock"
- [ ] Reorder → draft PO created, suggestion status = ordered; app refetches buyer PO list then navigates to PO detail (order loads without "Order not found")
- [ ] Dismiss / Snooze → suggestion disappears from open list

## One-tap reorder

- [ ] Product has default_supplier_id; supplier has a marketplace product with same name
- [ ] Create reorder suggestion → Reorder → PO created with one item, correct quantity and unit price
- [ ] If supplier has no matching product name → error message shown

## COGS & POS

- [ ] Complete a POS sale with products in cart (productId is sent in receipt items)
- [ ] Check sales_cogs table: rows for each line with document_id and sale transaction
- [ ] Check inventory_movements: type = 'sale', source_ref_type = 'pos_sale'

## Inventory movements (purchase)

- [ ] Add PO to inventory (Add to inventory flow)
- [ ] Check inventory_transactions row exists
- [ ] Check inventory_movements: type = 'purchase', source_ref_type = 'purchase_order'
- [ ] Check products: last_cost_price, last_purchase_date updated

## Reports

- [ ] **Supplier profit** (Reports → More reports → Supplier profit): purchases, revenue, COGS, gross profit, margin by supplier; uses RPC get_supplier_profit_summary
- [ ] **Inventory valuation** (Reports → More reports → Inventory valuation): total value (qty × cost), category breakdown
- [ ] **P&L** (Reports tab): Revenue − COGS = Gross profit; then − Expenses = Net profit (uses get_pnl_summary when sales_cogs exist)
- [ ] Balance sheet: inventory value from products (already in place)

## Permissions

- [ ] Employee with products:view / products:manage_stock can open Reorder suggestions
- [ ] Employee without permission sees Reorder suggestions disabled or hidden per your policy
- [ ] inventory:view, inventory:edit, reports:view added to employee_permissions (procurement_supplier_performance.sql)
- [ ] "More reports" (Supplier profit, Inventory valuation) visible only when isOwner or reports:view or finances:view_reports

## Supplier performance (Part 5)

- [ ] Run procurement_supplier_performance.sql (view supplier_performance_score + employee permissions)
- [ ] Supplier dashboard → Performance: score, badges, metrics, tips
- [ ] Admin → Supplier performance: ranked list with score and badges
