import type { 
  Transaction, 
  Document, 
  Product, 
  Customer, 
  Supplier, 
  Budget, 
  CashflowProjection,
  TaxRate,
  Employee,
  Project,
  BusinessProfile
} from '@/types/business';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeTransactions?: boolean;
  includeDocuments?: boolean;
  includeProducts?: boolean;
  includeCustomers?: boolean;
  includeSuppliers?: boolean;
  includeBudgets?: boolean;
  includeCashflow?: boolean;
  includeTaxRates?: boolean;
  includeEmployees?: boolean;
  includeProjects?: boolean;
  dateRange?: { start: string; end: string };
}

export function exportToCSV(data: any[], headers: string[]): string {
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(`"${values.join('","')}"`);
  }
  
  return csvRows.join('\n');
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount', 'Currency'];
  const rows = transactions.map(t => ({
    Date: t.date,
    Type: t.type,
    Description: t.description,
    Category: t.category,
    Amount: t.amount,
    Currency: t.currency,
  }));
  return exportToCSV(rows, headers);
}

export function exportDocumentsToCSV(documents: Document[]): string {
  const headers = ['Document Number', 'Type', 'Date', 'Due Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Subtotal', 'Tax', 'Total', 'Currency', 'Status'];
  const rows = documents.map(d => ({
    'Document Number': d.documentNumber,
    'Type': d.type,
    'Date': d.date,
    'Due Date': d.dueDate || '',
    'Customer Name': d.customerName,
    'Customer Email': d.customerEmail || '',
    'Customer Phone': d.customerPhone || '',
    'Subtotal': d.subtotal,
    'Tax': d.tax || 0,
    'Total': d.total,
    'Currency': d.currency,
    'Status': d.status || 'draft',
  }));
  return exportToCSV(rows, headers);
}

export function exportProductsToCSV(products: Product[]): string {
  const headers = ['Name', 'Category', 'Quantity', 'Cost Price', 'Selling Price', 'Currency'];
  const rows = products.map(p => ({
    Name: p.name,
    Category: p.category || '',
    Quantity: p.quantity,
    'Cost Price': p.costPrice || 0,
    'Selling Price': p.sellingPrice || 0,
    Currency: p.currency,
  }));
  return exportToCSV(rows, headers);
}

export function exportCustomersToCSV(customers: Customer[]): string {
  const headers = ['Name', 'Email', 'Phone', 'Address', 'Total Purchases', 'Last Purchase Date'];
  const rows = customers.map(c => ({
    Name: c.name,
    Email: c.email || '',
    Phone: c.phone || '',
    Address: c.address || '',
    'Total Purchases': c.totalPurchases,
    'Last Purchase Date': c.lastPurchaseDate || '',
  }));
  return exportToCSV(rows, headers);
}

export function exportAllData(
  data: {
    transactions?: Transaction[];
    documents?: Document[];
    products?: Product[];
    customers?: Customer[];
    suppliers?: Supplier[];
    budgets?: Budget[];
    cashflowProjections?: CashflowProjection[];
    taxRates?: TaxRate[];
    employees?: Employee[];
    projects?: Project[];
    business?: BusinessProfile;
  },
  options: ExportOptions
): string {
  if (options.format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  const csvParts: string[] = [];
  
  if (options.includeTransactions && data.transactions) {
    csvParts.push('=== TRANSACTIONS ===');
    csvParts.push(exportTransactionsToCSV(data.transactions));
    csvParts.push('');
  }
  
  if (options.includeDocuments && data.documents) {
    csvParts.push('=== DOCUMENTS ===');
    csvParts.push(exportDocumentsToCSV(data.documents));
    csvParts.push('');
  }
  
  if (options.includeProducts && data.products) {
    csvParts.push('=== PRODUCTS ===');
    csvParts.push(exportProductsToCSV(data.products));
    csvParts.push('');
  }
  
  if (options.includeCustomers && data.customers) {
    csvParts.push('=== CUSTOMERS ===');
    csvParts.push(exportCustomersToCSV(data.customers));
    csvParts.push('');
  }
  
  return csvParts.join('\n');
}

export async function shareData(data: string, filename: string, mimeType: string) {
  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    
    const docDir = (FileSystem as any).documentDirectory;
    if (!docDir) {
      throw new Error('File system not available');
    }
    
    const fileUri = `${docDir}${filename}`;
    await (FileSystem as any).writeAsStringAsync(fileUri, data, { encoding: (FileSystem as any).EncodingType.UTF8 });
    await (Sharing as any).shareAsync(fileUri, { mimeType, UTI: mimeType });
  } catch (error) {
    console.error('Share failed:', error);
    throw new Error('Sharing not supported on this platform');
  }
}

