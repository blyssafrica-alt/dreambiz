-- Insert Document Templates
-- These templates define the structure and fields for different document types

-- Invoice Templates
INSERT INTO document_templates (name, document_type, business_type, required_fields, numbering_rule, template_data, is_active, version)
VALUES
  (
    'Standard Invoice',
    'invoice',
    NULL,
    ARRAY['customer_name', 'items', 'subtotal', 'tax', 'total', 'due_date'],
    'INV-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#0066CC", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Customer Name", "type": "text", "required": true}, {"id": "items", "label": "Items", "type": "table", "required": true}, {"id": "due_date", "label": "Due Date", "type": "date", "required": true}]}'::jsonb,
    true,
    1
  ),
  (
    'Service Invoice',
    'invoice',
    'services',
    ARRAY['customer_name', 'service_description', 'hours', 'rate', 'total', 'due_date'],
    'INV-SVC-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#8B5CF6", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Client Name", "type": "text", "required": true}, {"id": "service_description", "label": "Service Description", "type": "textarea", "required": true}, {"id": "hours", "label": "Hours", "type": "number", "required": true}, {"id": "rate", "label": "Rate per Hour", "type": "currency", "required": true}]}'::jsonb,
    true,
    1
  ),
  (
    'Retail Invoice',
    'invoice',
    'retail',
    ARRAY['customer_name', 'items', 'subtotal', 'tax', 'discount', 'total'],
    'INV-RTL-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#10B981", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Customer Name", "type": "text", "required": true}, {"id": "items", "label": "Products", "type": "table", "required": true}, {"id": "discount", "label": "Discount", "type": "percentage", "required": false}]}'::jsonb,
    true,
    1
  )
ON CONFLICT DO NOTHING;

-- Receipt Templates
INSERT INTO document_templates (name, document_type, business_type, required_fields, numbering_rule, template_data, is_active, version)
VALUES
  (
    'Standard Receipt',
    'receipt',
    NULL,
    ARRAY['customer_name', 'items', 'subtotal', 'tax', 'total', 'payment_method'],
    'REC-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#10B981", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Customer Name", "type": "text", "required": true}, {"id": "items", "label": "Items", "type": "table", "required": true}, {"id": "payment_method", "label": "Payment Method", "type": "select", "required": true, "options": ["cash", "card", "mobile_money", "bank_transfer"]}]}'::jsonb,
    true,
    1
  ),
  (
    'POS Receipt',
    'receipt',
    'retail',
    ARRAY['customer_name', 'items', 'subtotal', 'tax', 'discount', 'total', 'payment_method', 'change'],
    'POS-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#F59E0B", "fontFamily": "Courier"}, "fields": [{"id": "customer_name", "label": "Customer", "type": "text", "required": false}, {"id": "items", "label": "Items", "type": "table", "required": true}, {"id": "payment_method", "label": "Payment Method", "type": "select", "required": true}, {"id": "change", "label": "Change", "type": "currency", "required": false}]}'::jsonb,
    true,
    1
  )
ON CONFLICT DO NOTHING;

-- Quotation Templates
INSERT INTO document_templates (name, document_type, business_type, required_fields, numbering_rule, template_data, is_active, version)
VALUES
  (
    'Standard Quotation',
    'quotation',
    NULL,
    ARRAY['customer_name', 'items', 'subtotal', 'tax', 'total', 'valid_until'],
    'QUO-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#3B82F6", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Customer Name", "type": "text", "required": true}, {"id": "items", "label": "Items", "type": "table", "required": true}, {"id": "valid_until", "label": "Valid Until", "type": "date", "required": true}]}'::jsonb,
    true,
    1
  ),
  (
    'Service Quotation',
    'quotation',
    'services',
    ARRAY['customer_name', 'service_description', 'scope', 'timeline', 'pricing', 'valid_until'],
    'QUO-SVC-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#8B5CF6", "fontFamily": "Arial"}, "fields": [{"id": "customer_name", "label": "Client Name", "type": "text", "required": true}, {"id": "service_description", "label": "Service Description", "type": "textarea", "required": true}, {"id": "scope", "label": "Scope of Work", "type": "textarea", "required": true}, {"id": "timeline", "label": "Timeline", "type": "text", "required": true}, {"id": "pricing", "label": "Pricing", "type": "currency", "required": true}]}'::jsonb,
    true,
    1
  )
ON CONFLICT DO NOTHING;

-- Purchase Order Templates
INSERT INTO document_templates (name, document_type, business_type, required_fields, numbering_rule, template_data, is_active, version)
VALUES
  (
    'Standard Purchase Order',
    'purchase_order',
    NULL,
    ARRAY['supplier_name', 'items', 'subtotal', 'tax', 'total', 'delivery_date'],
    'PO-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#EF4444", "fontFamily": "Arial"}, "fields": [{"id": "supplier_name", "label": "Supplier Name", "type": "text", "required": true}, {"id": "items", "label": "Items", "type": "table", "required": true}, {"id": "delivery_date", "label": "Delivery Date", "type": "date", "required": true}, {"id": "delivery_address", "label": "Delivery Address", "type": "textarea", "required": true}]}'::jsonb,
    true,
    1
  )
ON CONFLICT DO NOTHING;

-- Contract Templates
INSERT INTO document_templates (name, document_type, business_type, required_fields, numbering_rule, template_data, is_active, version)
VALUES
  (
    'Service Contract',
    'contract',
    'services',
    ARRAY['party_name', 'service_description', 'terms', 'duration', 'payment_terms', 'start_date', 'end_date'],
    'CTR-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#6366F1", "fontFamily": "Arial"}, "fields": [{"id": "party_name", "label": "Party Name", "type": "text", "required": true}, {"id": "service_description", "label": "Service Description", "type": "textarea", "required": true}, {"id": "terms", "label": "Terms and Conditions", "type": "textarea", "required": true}, {"id": "duration", "label": "Contract Duration", "type": "text", "required": true}, {"id": "payment_terms", "label": "Payment Terms", "type": "textarea", "required": true}]}'::jsonb,
    true,
    1
  ),
  (
    'Supplier Agreement',
    'supplier_agreement',
    NULL,
    ARRAY['supplier_name', 'products_services', 'pricing', 'delivery_terms', 'payment_terms', 'start_date'],
    'SUP-{YYYY}-{####}',
    '{"styling": {"primaryColor": "#059669", "fontFamily": "Arial"}, "fields": [{"id": "supplier_name", "label": "Supplier Name", "type": "text", "required": true}, {"id": "products_services", "label": "Products/Services", "type": "textarea", "required": true}, {"id": "pricing", "label": "Pricing Agreement", "type": "textarea", "required": true}, {"id": "delivery_terms", "label": "Delivery Terms", "type": "textarea", "required": true}, {"id": "payment_terms", "label": "Payment Terms", "type": "textarea", "required": true}]}'::jsonb,
    true,
    1
  )
ON CONFLICT DO NOTHING;

