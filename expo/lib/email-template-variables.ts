/** Available variables for email templates. Tap to insert {{key}} into HTML. */
export const TEMPLATE_VARIABLES = [
  { key: 'first_name', label: 'First name', desc: "Recipient's first name" },
  { key: 'business_name', label: 'Business name', desc: "Recipient's business name" },
  { key: 'supplier_store', label: 'Supplier store', desc: 'Store/shop name (suppliers)' },
  { key: 'plan_name', label: 'Plan name', desc: 'Subscription plan name' },
  { key: 'days_left', label: 'Days left', desc: 'Days until trial/subscription ends' },
  { key: 'unsubscribe_url', label: 'Unsubscribe URL', desc: 'Link for unsubscribe – include in all emails' },
] as const;

export function toVariableTag(key: string): string {
  return `{{${key}}}`;
}

export function applySampleVariables(html: string): string {
  return (html || '')
    .replace(/\{\{first_name\}\}/g, 'Alex')
    .replace(/\{\{business_name\}\}/g, 'Sample Business')
    .replace(/\{\{supplier_store\}\}/g, 'Sample Store')
    .replace(/\{\{plan_name\}\}/g, 'Pro')
    .replace(/\{\{days_left\}\}/g, '7')
    .replace(/\{\{unsubscribe_url\}\}/g, '#unsubscribe');
}
