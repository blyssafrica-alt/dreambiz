import type { BusinessType } from '@/types/business';

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  businessTypes: BusinessType[];
  categories: { category: string; percentage: number; description: string }[];
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: 'retail-basic',
    name: 'Retail Store - Basic',
    description: 'Standard budget template for retail businesses',
    businessTypes: ['retail'],
    categories: [
      { category: 'Inventory', percentage: 40, description: 'Stock and merchandise' },
      { category: 'Rent', percentage: 15, description: 'Store rental costs' },
      { category: 'Salaries', percentage: 20, description: 'Staff wages' },
      { category: 'Marketing', percentage: 10, description: 'Advertising and promotions' },
      { category: 'Utilities', percentage: 5, description: 'Electricity, water, internet' },
      { category: 'Other', percentage: 10, description: 'Miscellaneous expenses' },
    ],
  },
  {
    id: 'services-basic',
    name: 'Services Business - Basic',
    description: 'Standard budget template for service-based businesses',
    businessTypes: ['services'],
    categories: [
      { category: 'Salaries', percentage: 35, description: 'Staff and contractor payments' },
      { category: 'Marketing', percentage: 20, description: 'Client acquisition and branding' },
      { category: 'Office Rent', percentage: 15, description: 'Workspace costs' },
      { category: 'Equipment', percentage: 10, description: 'Tools and equipment' },
      { category: 'Utilities', percentage: 5, description: 'Office utilities' },
      { category: 'Professional Services', percentage: 10, description: 'Legal, accounting, etc.' },
      { category: 'Other', percentage: 5, description: 'Miscellaneous expenses' },
    ],
  },
  {
    id: 'restaurant-basic',
    name: 'Restaurant - Basic',
    description: 'Standard budget template for restaurants and cafes',
    businessTypes: ['restaurant'],
    categories: [
      { category: 'Food & Beverages', percentage: 30, description: 'Ingredients and supplies' },
      { category: 'Salaries', percentage: 25, description: 'Kitchen and service staff' },
      { category: 'Rent', percentage: 12, description: 'Restaurant space rental' },
      { category: 'Marketing', percentage: 8, description: 'Promotions and advertising' },
      { category: 'Utilities', percentage: 10, description: 'Electricity, water, gas' },
      { category: 'Equipment Maintenance', percentage: 5, description: 'Kitchen equipment upkeep' },
      { category: 'Other', percentage: 10, description: 'Miscellaneous expenses' },
    ],
  },
  {
    id: 'manufacturing-basic',
    name: 'Manufacturing - Basic',
    description: 'Standard budget template for manufacturing businesses',
    businessTypes: ['manufacturing'],
    categories: [
      { category: 'Raw Materials', percentage: 35, description: 'Production materials' },
      { category: 'Salaries', percentage: 25, description: 'Production and admin staff' },
      { category: 'Equipment', percentage: 15, description: 'Machinery and tools' },
      { category: 'Utilities', percentage: 8, description: 'Factory utilities' },
      { category: 'Marketing', percentage: 7, description: 'Sales and marketing' },
      { category: 'Other', percentage: 10, description: 'Miscellaneous expenses' },
    ],
  },
  {
    id: 'construction-basic',
    name: 'Construction - Basic',
    description: 'Standard budget template for construction businesses',
    businessTypes: ['construction'],
    categories: [
      { category: 'Materials', percentage: 40, description: 'Building materials' },
      { category: 'Labor', percentage: 30, description: 'Workers and contractors' },
      { category: 'Equipment', percentage: 10, description: 'Tools and machinery' },
      { category: 'Transport', percentage: 5, description: 'Vehicle and fuel costs' },
      { category: 'Insurance', percentage: 5, description: 'Business insurance' },
      { category: 'Other', percentage: 10, description: 'Miscellaneous expenses' },
    ],
  },
  {
    id: 'salon-basic',
    name: 'Salon - Basic',
    description: 'Standard budget template for salons and beauty businesses',
    businessTypes: ['salon'],
    categories: [
      { category: 'Products', percentage: 25, description: 'Beauty products and supplies' },
      { category: 'Salaries', percentage: 30, description: 'Stylists and staff' },
      { category: 'Rent', percentage: 15, description: 'Salon space rental' },
      { category: 'Marketing', percentage: 12, description: 'Promotions and advertising' },
      { category: 'Utilities', percentage: 8, description: 'Electricity, water' },
      { category: 'Other', percentage: 10, description: 'Miscellaneous expenses' },
    ],
  },
];

export function getBudgetTemplatesForBusinessType(businessType?: BusinessType): BudgetTemplate[] {
  if (!businessType) return BUDGET_TEMPLATES;
  return BUDGET_TEMPLATES.filter(t => t.businessTypes.includes(businessType));
}

