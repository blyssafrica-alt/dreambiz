export interface Payment {
  id: string;
  documentId: string;
  amount: number;
  currency: 'USD' | 'ZWL';
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other';
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface RecurringInvoice {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  currency: 'USD' | 'ZWL';
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsReceivable {
  documentId: string;
  documentNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: 'USD' | 'ZWL';
  dueDate?: string;
  daysOverdue: number;
  status: 'current' | 'overdue' | 'paid';
}

export interface AccountsPayable {
  documentId: string;
  documentNumber: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: 'USD' | 'ZWL';
  dueDate?: string;
  daysOverdue: number;
  status: 'current' | 'overdue' | 'paid';
}

