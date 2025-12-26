import type { BusinessType, DocumentType, BusinessProfile, Document } from '@/types/business';

export interface DocumentTemplate {
  id: string;
  name: string;
  documentType: DocumentType;
  businessTypes: BusinessType[];
  layout: 'modern' | 'classic' | 'minimal' | 'detailed';
  fields: TemplateField[];
  styling: TemplateStyling;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: string;
  options?: string[];
  businessSpecific?: BusinessType[];
}

export interface TemplateStyling {
  primaryColor: string;
  headerStyle: 'gradient' | 'solid' | 'minimal';
  showLogo: boolean;
  showQRCode: boolean;
  showPaymentTerms: boolean;
  showDeliveryInfo: boolean;
}

// Get template for document type and business type
export function getDocumentTemplate(
  documentType: DocumentType,
  businessType: BusinessType
): DocumentTemplate {
  const templates = getAllTemplates();
  return (
    templates.find(
      (t) =>
        t.documentType === documentType &&
        (t.businessTypes.includes(businessType) || t.businessTypes.includes('other'))
    ) || getDefaultTemplate(documentType)
  );
}

// Get all available templates
export function getAllTemplates(): DocumentTemplate[] {
  return [
    // INVOICE TEMPLATES
    {
      id: 'invoice-retail',
      name: 'Retail Invoice',
      documentType: 'invoice',
      businessTypes: ['retail'],
      layout: 'detailed',
      fields: [
        { id: 'sku', label: 'SKU/Product Code', type: 'text', required: false },
        { id: 'barcode', label: 'Barcode', type: 'text', required: false },
        { id: 'warranty', label: 'Warranty Period', type: 'text', required: false },
        { id: 'return_policy', label: 'Return Policy', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#0066CC',
        headerStyle: 'gradient',
        showLogo: true,
        showQRCode: true,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
    {
      id: 'invoice-services',
      name: 'Service Invoice',
      documentType: 'invoice',
      businessTypes: ['services'],
      layout: 'modern',
      fields: [
        { id: 'service_date', label: 'Service Date', type: 'date', required: true },
        { id: 'service_time', label: 'Service Time', type: 'text', required: false },
        { id: 'project_ref', label: 'Project Reference', type: 'text', required: false },
        { id: 'hourly_rate', label: 'Hourly Rate', type: 'number', required: false },
        { id: 'hours', label: 'Hours Worked', type: 'number', required: false },
      ],
      styling: {
        primaryColor: '#10B981',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: false,
      },
    },
    {
      id: 'invoice-restaurant',
      name: 'Restaurant Invoice',
      documentType: 'invoice',
      businessTypes: ['restaurant'],
      layout: 'minimal',
      fields: [
        { id: 'table_number', label: 'Table Number', type: 'text', required: false },
        { id: 'guests', label: 'Number of Guests', type: 'number', required: false },
        { id: 'service_charge', label: 'Service Charge (%)', type: 'number', required: false },
        { id: 'tip', label: 'Tip', type: 'number', required: false },
      ],
      styling: {
        primaryColor: '#F59E0B',
        headerStyle: 'minimal',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: false,
        showDeliveryInfo: false,
      },
    },
    {
      id: 'invoice-salon',
      name: 'Salon Invoice',
      documentType: 'invoice',
      businessTypes: ['salon'],
      layout: 'modern',
      fields: [
        { id: 'appointment_date', label: 'Appointment Date', type: 'date', required: true },
        { id: 'stylist', label: 'Stylist', type: 'text', required: false },
        { id: 'service_package', label: 'Service Package', type: 'text', required: false },
        { id: 'products_used', label: 'Products Used', type: 'text', required: false },
        { id: 'next_appointment', label: 'Next Appointment', type: 'date', required: false },
      ],
      styling: {
        primaryColor: '#EC4899',
        headerStyle: 'gradient',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: false,
        showDeliveryInfo: false,
      },
    },
    {
      id: 'invoice-manufacturing',
      name: 'Manufacturing Invoice',
      documentType: 'invoice',
      businessTypes: ['manufacturing'],
      layout: 'detailed',
      fields: [
        { id: 'part_number', label: 'Part Number', type: 'text', required: false },
        { id: 'specifications', label: 'Specifications', type: 'text', required: false },
        { id: 'batch_number', label: 'Batch Number', type: 'text', required: false },
        { id: 'delivery_date', label: 'Delivery Date', type: 'date', required: true },
        { id: 'quality_cert', label: 'Quality Certificate', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#6366F1',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: true,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
    {
      id: 'invoice-construction',
      name: 'Construction Invoice',
      documentType: 'invoice',
      businessTypes: ['construction'],
      layout: 'detailed',
      fields: [
        { id: 'project_phase', label: 'Project Phase', type: 'text', required: false },
        { id: 'materials', label: 'Materials', type: 'text', required: false },
        { id: 'labor_hours', label: 'Labor Hours', type: 'number', required: false },
        { id: 'completion_date', label: 'Completion Date', type: 'date', required: false },
        { id: 'warranty_period', label: 'Warranty Period', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#8B5CF6',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
    // RECEIPT TEMPLATES
    {
      id: 'receipt-retail',
      name: 'Retail Receipt',
      documentType: 'receipt',
      businessTypes: ['retail'],
      layout: 'minimal',
      fields: [
        { id: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: ['Cash', 'Card', 'Mobile Money', 'Bank Transfer'] },
        { id: 'change', label: 'Change Given', type: 'number', required: false },
        { id: 'loyalty_points', label: 'Loyalty Points Earned', type: 'number', required: false },
      ],
      styling: {
        primaryColor: '#10B981',
        headerStyle: 'minimal',
        showLogo: true,
        showQRCode: true,
        showPaymentTerms: false,
        showDeliveryInfo: false,
      },
    },
    {
      id: 'receipt-services',
      name: 'Service Receipt',
      documentType: 'receipt',
      businessTypes: ['services'],
      layout: 'modern',
      fields: [
        { id: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: ['Cash', 'Card', 'Bank Transfer', 'Mobile Money'] },
        { id: 'reference', label: 'Payment Reference', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#10B981',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: false,
        showDeliveryInfo: false,
      },
    },
    // QUOTATION TEMPLATES
    {
      id: 'quotation-services',
      name: 'Service Quotation',
      documentType: 'quotation',
      businessTypes: ['services'],
      layout: 'modern',
      fields: [
        { id: 'valid_until', label: 'Valid Until', type: 'date', required: true },
        { id: 'project_timeline', label: 'Project Timeline', type: 'text', required: false },
        { id: 'terms', label: 'Terms & Conditions', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#F59E0B',
        headerStyle: 'gradient',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: false,
      },
    },
    {
      id: 'quotation-manufacturing',
      name: 'Manufacturing Quotation',
      documentType: 'quotation',
      businessTypes: ['manufacturing'],
      layout: 'detailed',
      fields: [
        { id: 'valid_until', label: 'Valid Until', type: 'date', required: true },
        { id: 'delivery_time', label: 'Delivery Time', type: 'text', required: true },
        { id: 'minimum_order', label: 'Minimum Order Quantity', type: 'number', required: false },
        { id: 'specifications', label: 'Specifications', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#6366F1',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
    // PURCHASE ORDER TEMPLATES
    {
      id: 'po-retail',
      name: 'Retail Purchase Order',
      documentType: 'purchase_order',
      businessTypes: ['retail'],
      layout: 'detailed',
      fields: [
        { id: 'expected_delivery', label: 'Expected Delivery Date', type: 'date', required: true },
        { id: 'delivery_address', label: 'Delivery Address', type: 'text', required: true },
        { id: 'payment_terms', label: 'Payment Terms', type: 'text', required: true },
      ],
      styling: {
        primaryColor: '#8B5CF6',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
    // CONTRACT TEMPLATES
    {
      id: 'contract-services',
      name: 'Service Contract',
      documentType: 'contract',
      businessTypes: ['services'],
      layout: 'detailed',
      fields: [
        { id: 'contract_start', label: 'Contract Start Date', type: 'date', required: true },
        { id: 'contract_end', label: 'Contract End Date', type: 'date', required: true },
        { id: 'payment_schedule', label: 'Payment Schedule', type: 'text', required: true },
        { id: 'termination_clause', label: 'Termination Clause', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#EC4899',
        headerStyle: 'gradient',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: false,
      },
    },
    // SUPPLIER AGREEMENT TEMPLATES
    {
      id: 'supplier-agreement',
      name: 'Supplier Agreement',
      documentType: 'supplier_agreement',
      businessTypes: ['retail', 'manufacturing', 'restaurant'],
      layout: 'detailed',
      fields: [
        { id: 'agreement_start', label: 'Agreement Start Date', type: 'date', required: true },
        { id: 'agreement_end', label: 'Agreement End Date', type: 'date', required: false },
        { id: 'payment_terms', label: 'Payment Terms', type: 'text', required: true },
        { id: 'delivery_terms', label: 'Delivery Terms', type: 'text', required: true },
        { id: 'quality_standards', label: 'Quality Standards', type: 'text', required: false },
      ],
      styling: {
        primaryColor: '#6366F1',
        headerStyle: 'solid',
        showLogo: true,
        showQRCode: false,
        showPaymentTerms: true,
        showDeliveryInfo: true,
      },
    },
  ];
}

// Get default template for document type
export function getDefaultTemplate(documentType: DocumentType): DocumentTemplate {
  return {
    id: `default-${documentType}`,
    name: `Default ${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`,
    documentType,
    businessTypes: ['other'],
    layout: 'modern',
    fields: [],
    styling: {
      primaryColor: '#0066CC',
      headerStyle: 'gradient',
      showLogo: true,
      showQRCode: false,
      showPaymentTerms: true,
      showDeliveryInfo: false,
    },
  };
}

// Generate document content based on template
export function generateDocumentContent(
  document: Document,
  business: BusinessProfile,
  template: DocumentTemplate
): string {
  const formatCurrency = (amount: number) => {
    const symbol = document.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  let content = '';

  // Header based on template style
  if (template.styling.headerStyle === 'gradient') {
    content += `╔${'═'.repeat(58)}╗\n`;
    content += `║${' '.repeat(20)}${business.name.toUpperCase()}${' '.repeat(20)}║\n`;
    content += `╚${'═'.repeat(58)}╝\n\n`;
  } else if (template.styling.headerStyle === 'solid') {
    content += `${'═'.repeat(60)}\n`;
    content += `${business.name.toUpperCase()}\n`;
    content += `${'═'.repeat(60)}\n\n`;
  } else {
    content += `${business.name}\n`;
    content += `${'-'.repeat(60)}\n\n`;
  }

  // Document type and number
  const docTypeLabel = document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ');
  content += `${docTypeLabel.toUpperCase()}\n`;
  content += `Number: ${document.documentNumber}\n`;
  content += `Date: ${formatDate(document.date)}\n\n`;

  // Business-specific fields
  if (template.fields.length > 0) {
    content += `DETAILS:\n`;
    content += `${'-'.repeat(60)}\n`;
    // Add template-specific fields here
    content += `\n`;
  }

  // From/To sections
  content += `FROM:\n`;
  content += `${business.name}\n`;
  if (business.phone) content += `Phone: ${business.phone}\n`;
  if (business.location) content += `Location: ${business.location}\n`;
  if (business.email) content += `Email: ${business.email}\n`;
  content += `\n`;

  const recipientLabel = document.type === 'purchase_order' || document.type === 'supplier_agreement' 
    ? 'SUPPLIER' 
    : 'TO';
  content += `${recipientLabel}:\n`;
  content += `${document.customerName}\n`;
  if (document.customerPhone) content += `Phone: ${document.customerPhone}\n`;
  if (document.customerEmail) content += `Email: ${document.customerEmail}\n`;
  content += `\n`;

  // Items
  content += `ITEMS:\n`;
  content += `${'-'.repeat(60)}\n`;
  document.items.forEach((item, index) => {
    content += `${index + 1}. ${item.description}\n`;
    content += `   Quantity: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}\n`;
  });
  content += `${'-'.repeat(60)}\n\n`;

  // Totals
  content += `SUBTOTAL: ${formatCurrency(document.subtotal)}\n`;
  if (document.tax) {
    content += `TAX: ${formatCurrency(document.tax)}\n`;
  }
  content += `TOTAL: ${formatCurrency(document.total)}\n\n`;

  // Payment terms if enabled
  if (template.styling.showPaymentTerms && document.dueDate) {
    content += `PAYMENT TERMS:\n`;
    content += `Due Date: ${formatDate(document.dueDate)}\n\n`;
  }

  // Notes
  if (document.notes) {
    content += `NOTES:\n`;
    content += `${document.notes}\n\n`;
  }

  // Footer
  content += `\n${'─'.repeat(60)}\n`;
  content += `Generated by DreamBig Business OS\n`;
  content += `Thank you for your business!\n`;

  return content;
}

