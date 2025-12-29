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

    return data
      .filter((row: any) => row && row.id) // Filter out invalid rows
      .map((row: any) => {
        try {
          // Safely parse book_reference JSONB field
          let bookReference = null;
          if (row.book_reference) {
            try {
              // If it's already an object, use it directly (Supabase returns JSONB as object)
              if (typeof row.book_reference === 'object' && row.book_reference !== null) {
                bookReference = row.book_reference;
              } 
              // If it's a string, parse it
              else if (typeof row.book_reference === 'string' && row.book_reference.trim()) {
                bookReference = JSON.parse(row.book_reference);
              }
            } catch (e) {
              console.warn('Failed to parse book_reference for alert rule:', row.id, e);
              bookReference = null;
            }
          }

          // Ensure messageTemplate is always a string
          let messageTemplate = '';
          if (row.message_template) {
            if (typeof row.message_template === 'string') {
              messageTemplate = row.message_template;
            } else {
              messageTemplate = String(row.message_template);
            }
          }

          // Ensure actionTemplate is a string or undefined
          let actionTemplate = undefined;
          if (row.action_template) {
            if (typeof row.action_template === 'string') {
              actionTemplate = row.action_template;
            } else {
              actionTemplate = String(row.action_template);
            }
          }

          return {
            id: String(row.id),
            name: String(row.name || ''),
            type: row.type || 'info',
            conditionType: String(row.condition_type || ''),
            thresholdValue: row.threshold_value != null ? parseFloat(String(row.threshold_value)) : undefined,
            thresholdPercentage: row.threshold_percentage != null ? parseFloat(String(row.threshold_percentage)) : undefined,
            thresholdDays: row.threshold_days != null ? parseInt(String(row.threshold_days), 10) : undefined,
            messageTemplate: messageTemplate,
            actionTemplate: actionTemplate,
            bookReference: bookReference,
            isActive: Boolean(row.is_active),
            priority: parseInt(String(row.priority || 0), 10),
            createdBy: row.created_by || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          };
        } catch (error) {
          console.error('Error mapping alert rule:', row?.id, error);
          return null;
        }
      })
      .filter((rule: any) => rule !== null); // Remove any null entries from failed mappings
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
  // Validate inputs
  if (!rules || !Array.isArray(rules)) {
    console.warn('Invalid rules array provided to evaluateAlertRules');
    return [];
  }
  
  if (!metrics || typeof metrics !== 'object') {
    console.warn('Invalid metrics provided to evaluateAlertRules');
    return [];
  }

  const alerts: EvaluatedAlert[] = [];
  const now = new Date();

  for (const rule of rules) {
    // Skip invalid rules
    if (!rule || !rule.id || !rule.conditionType) {
      console.warn('Skipping invalid alert rule:', rule);
      continue;
    }
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
      try {
        // Format message template safely
        let message = rule.messageTemplate || '';
        if (typeof message !== 'string') {
          message = String(message);
        }
        
        if (value !== undefined && !isNaN(value)) {
          message = message.replace(/{value}/g, value.toFixed(2));
        }
        if (percentage !== undefined && !isNaN(percentage)) {
          message = message.replace(/{percentage}/g, percentage.toFixed(1));
        }
        if (days !== undefined && !isNaN(days)) {
          message = message.replace(/{days}/g, days.toString());
        }

        // Safely parse book reference
        let bookReference = undefined;
        if (rule.bookReference) {
          try {
            const ref = typeof rule.bookReference === 'string' 
              ? JSON.parse(rule.bookReference) 
              : rule.bookReference;
            
            if (ref && typeof ref === 'object') {
              bookReference = {
                book: ref.book || '',
                chapter: typeof ref.chapter === 'number' ? ref.chapter : 0,
                chapterTitle: ref.chapterTitle || '',
              };
            }
          } catch (e) {
            console.warn('Failed to parse bookReference for alert:', rule.id, e);
          }
        }

        alerts.push({
          id: rule.id,
          type: rule.type,
          message,
          action: rule.actionTemplate || undefined,
          bookReference,
        });
      } catch (error) {
        console.error('Error processing alert rule:', rule.id, error);
        // Skip this alert if there's an error processing it
      }
    }
  }

  // Sort by priority (higher priority first)
  return alerts.sort((a, b) => {
    const aRule = rules.find(r => r.id === a.id);
    const bRule = rules.find(r => r.id === b.id);
    return (bRule?.priority || 0) - (aRule?.priority || 0);
  });
}

