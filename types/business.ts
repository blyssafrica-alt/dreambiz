export type Currency = 'USD' | 'ZWL';

export type DreamBigBook = 
  | 'start-your-business'
  | 'grow-your-business'
  | 'manage-your-money'
  | 'hire-and-lead'
  | 'marketing-mastery'
  | 'scale-up'
  | 'none';

export type BusinessStage = 'idea' | 'running' | 'growing';

export type BusinessType = 
  | 'retail' | 'services' | 'manufacturing' | 'agriculture' 
  | 'restaurant' | 'salon' | 'construction' | 'transport' | 'other';

export interface ExchangeRate {
  usdToZwl: number;
  lastUpdated: string;
  inflationRate?: number;
}

export interface BusinessProfile {
  id: string;
  name: string;
  type: BusinessType;
  stage: BusinessStage;
  location: string;
  capital: number;
  currency: Currency;
  createdAt: string;
  owner: string;
  phone?: string;
  email?: string;
  address?: string;
  dreamBigBook?: DreamBigBook;
}

export type TransactionType = 'sale' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  category: string;
  date: string;
  createdAt: string;
}

export type DocumentType = 'invoice' | 'receipt' | 'quotation' | 'purchase_order' | 'contract' | 'supplier_agreement';
export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface Document {
  id: string;
  type: DocumentType;
  documentNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: DocumentItem[];
  subtotal: number;
  tax?: number;
  total: number;
  currency: Currency;
  date: string;
  dueDate?: string;
  status?: DocumentStatus;
  createdAt: string;
  notes?: string;
  paidAmount?: number; // For partial payments
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other';
}

export interface Budget {
  id: string;
  name: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  categories: { category: string; budgeted: number }[];
  totalBudget: number;
  currency: Currency;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashflowProjection {
  id: string;
  month: string;
  openingBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  closingBalance: number;
  currency: Currency;
  notes?: string;
  createdAt: string;
}

export interface TaxRate {
  id: string;
  name: string;
  type: 'VAT' | 'sales_tax' | 'income_tax' | 'custom';
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  appliesTo?: 'all' | 'products' | 'services' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  position?: string;
  hireDate?: string;
  salary?: number;
  currency?: Currency;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientName?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: Currency;
  progress: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ViabilityInput {
  capital: number;
  monthlyExpenses: number;
  pricePerUnit: number;
  costPerUnit: number;
  expectedSalesPerMonth: number;
  currency: Currency;
}

export interface ViabilityResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  monthlyProfit: number;
  monthsToRecoverCapital: number;
  verdict: 'viable' | 'risky' | 'not-viable';
  warnings: string[];
  profitMargin: number;
  scenarios?: {
    optimistic: ScenarioResult;
    realistic: ScenarioResult;
    pessimistic: ScenarioResult;
  };
}

export interface ScenarioResult {
  salesVolume: number;
  monthlyProfit: number;
  monthsToRecover: number;
  verdict: 'viable' | 'risky' | 'not-viable';
}

export interface DashboardMetrics {
  todaySales: number;
  todayExpenses: number;
  todayProfit: number;
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  cashPosition: number;
  topCategories: { category: string; amount: number }[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  action?: string;
  bookReference?: {
    book: DreamBigBook;
    chapter: number;
    chapterTitle: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  currency: Currency;
  quantity: number;
  category?: string;
  isActive: boolean;
  isTaxExempt?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  lastPurchaseDate?: string;
  isTaxExempt?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  totalPurchases: number;
  lastPurchaseDate?: string;
  paymentTerms?: string;
  createdAt: string;
  updatedAt: string;
}