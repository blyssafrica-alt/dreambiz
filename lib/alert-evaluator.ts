import { supabase } from './supabase';
import type { AlertRule } from '@/types/super-admin';
import type { Transaction, Product, Document, BusinessProfile } from '@/types/business';

interface BusinessMetrics {
  monthSales: number;
  monthExpenses: number;
  monthProfit: number;
  profitMargin: number;
  cashPosition: number;
  transactions: Transaction[];
  products: Product[];
  documents: Document[];
  business: BusinessProfile | null;
}

export interface EvaluatedAlert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  message: string;
  action?: string;
  bookReference?: {
    book: string;
    chapter: number;
    chapterTitle: string;
  };
}

/**
 * Fetch active alert rules from database
 */
export async function fetchActiveAlertRules(): Promise<AlertRule[]> {
  try {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch alert rules:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      conditionType: row.condition_type,
      thresholdValue: row.threshold_value ? parseFloat(row.threshold_value) : undefined,
      thresholdPercentage: row.threshold_percentage ? parseFloat(row.threshold_percentage) : undefined,
      thresholdDays: row.threshold_days,
      messageTemplate: row.message_template,
      actionTemplate: row.action_template,
      bookReference: row.book_reference,
      isActive: row.is_active,
      priority: row.priority,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return [];
  }
}

/**
 * Evaluate alert rules against business metrics
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  metrics: BusinessMetrics
): EvaluatedAlert[] {
  const alerts: EvaluatedAlert[] = [];
  const now = new Date();

  for (const rule of rules) {
    let shouldTrigger = false;
    let value: number | undefined;
    let percentage: number | undefined;
    let days: number | undefined;

    // Evaluate based on condition type
    switch (rule.conditionType) {
      case 'profit_margin':
        percentage = metrics.profitMargin;
        if (rule.thresholdPercentage !== undefined) {
          shouldTrigger = percentage < rule.thresholdPercentage;
        }
        break;

      case 'cash_position':
        value = metrics.cashPosition;
        if (rule.thresholdValue !== undefined) {
          shouldTrigger = value < rule.thresholdValue;
        }
        break;

      case 'no_sales':
        // Check if there are no sales in the last X days
        if (rule.thresholdDays !== undefined) {
          const cutoffDate = new Date(now.getTime() - rule.thresholdDays * 24 * 60 * 60 * 1000);
          const recentSales = metrics.transactions.filter(
            t => t.type === 'sale' && new Date(t.date) >= cutoffDate
          );
          shouldTrigger = recentSales.length === 0;
          days = rule.thresholdDays;
        }
        break;

      case 'low_stock':
        // Check if any products have stock below threshold
        if (rule.thresholdValue !== undefined) {
          const lowStockProducts = metrics.products.filter(
            p => p.isActive && p.quantity > 0 && p.quantity <= rule.thresholdValue!
          );
          shouldTrigger = lowStockProducts.length > 0;
          value = rule.thresholdValue;
        }
        break;

      case 'overdue_invoice':
        // Check if there are invoices overdue by X days
        if (rule.thresholdDays !== undefined) {
          const cutoffDate = new Date(now.getTime() - rule.thresholdDays * 24 * 60 * 60 * 1000);
          const overdueDocs = metrics.documents.filter(
            d => d.type === 'invoice' && 
                 d.status !== 'paid' && 
                 d.dueDate && 
                 new Date(d.dueDate) < cutoffDate
          );
          shouldTrigger = overdueDocs.length > 0;
          days = rule.thresholdDays;
        }
        break;

      case 'high_expenses':
        // Check if expenses are above threshold percentage of revenue
        if (rule.thresholdPercentage !== undefined && metrics.monthSales > 0) {
          const expenseRatio = (metrics.monthExpenses / metrics.monthSales) * 100;
          shouldTrigger = expenseRatio > rule.thresholdPercentage;
          percentage = expenseRatio;
        }
        break;

      case 'overspending':
        // Check if expenses exceed revenue
        if (rule.thresholdPercentage !== undefined) {
          const expenseRatio = metrics.monthSales > 0 
            ? (metrics.monthExpenses / metrics.monthSales) * 100 
            : 100;
          shouldTrigger = expenseRatio >= rule.thresholdPercentage;
          percentage = expenseRatio;
        }
        break;

      case 'low_revenue':
        // This would need previous period comparison - simplified for now
        // For now, we'll check if revenue is below a threshold
        if (rule.thresholdPercentage !== undefined) {
          // Negative percentage means decline
          // This is a simplified check - in production, compare with previous period
          shouldTrigger = false; // Placeholder - needs previous period data
        }
        break;

      default:
        continue;
    }

    if (shouldTrigger) {
      // Format message template
      let message = rule.messageTemplate || '';
      if (value !== undefined) {
        message = message.replace(/{value}/g, value.toFixed(2));
      }
      if (percentage !== undefined) {
        message = message.replace(/{percentage}/g, percentage.toFixed(1));
      }
      if (days !== undefined) {
        message = message.replace(/{days}/g, days.toString());
      }

      alerts.push({
        id: rule.id,
        type: rule.type,
        message,
        action: rule.actionTemplate || undefined,
        bookReference: rule.bookReference ? {
          book: rule.bookReference.book || '',
          chapter: rule.bookReference.chapter || 0,
          chapterTitle: rule.bookReference.chapterTitle || '',
        } : undefined,
      });
    }
  }

  // Sort by priority (higher priority first)
  return alerts.sort((a, b) => {
    const aRule = rules.find(r => r.id === a.id);
    const bRule = rules.find(r => r.id === b.id);
    return (bRule?.priority || 0) - (aRule?.priority || 0);
  });
}

