import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { getProvider } from '@/lib/providers';
import { getChapterForTopic } from '@/constants/book-chapters';
import type { 
  BusinessProfile, 
  Transaction, 
  Document, 
  ExchangeRate,
  DashboardMetrics,
  Alert,
  Product,
  Customer,
  Supplier,
  Budget,
  CashflowProjection,
  TaxRate,
  Employee,
  Project,
  ProjectTask
} from '@/types/business';
import type { RecurringInvoice, Payment } from '@/types/payments';

export const [BusinessContext, useBusiness] = createContextHook(() => {
  const { user, authUser } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cashflowProjections, setCashflowProjections] = useState<CashflowProjection[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
    usdToZwl: 25000,
    lastUpdated: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  // Get user ID - use authUser.id if available (even if profile not loaded yet)
  const userId = authUser?.id || user?.id;

  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const [businessRes, transactionsRes, documentsRes, productsRes, customersRes, suppliersRes, budgetsRes, cashflowRes, taxRatesRes, employeesRes, projectsRes, projectTasksRes, recurringInvoicesRes, paymentsRes, exchangeRateRes] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('documents').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('budgets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('cashflow_projections').select('*').eq('user_id', userId).order('month', { ascending: true }),
        supabase.from('tax_rates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('employees').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('project_tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('recurring_invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', userId).order('payment_date', { ascending: false }),
        supabase.from('exchange_rates').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
      ]);

      if (businessRes.data) {
        setBusiness({
          id: businessRes.data.id,
          name: businessRes.data.name,
          type: businessRes.data.type as any,
          stage: businessRes.data.stage as any,
          location: businessRes.data.location,
          capital: Number(businessRes.data.capital),
          currency: businessRes.data.currency as any,
          owner: businessRes.data.owner,
          phone: businessRes.data.phone || undefined,
          email: businessRes.data.email || undefined,
          address: businessRes.data.address || undefined,
          dreamBigBook: businessRes.data.dream_big_book as any,
          createdAt: businessRes.data.created_at,
        });
        setHasOnboarded(true);
      }

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data.map(t => ({
          id: t.id,
          type: t.type as any,
          amount: Number(t.amount),
          currency: t.currency as any,
          description: t.description,
          category: t.category,
          date: t.date,
          createdAt: t.created_at,
        })));
      }

      if (documentsRes.data) {
        setDocuments(documentsRes.data.map(d => ({
          id: d.id,
          type: d.type as any,
          documentNumber: d.document_number,
          customerName: d.customer_name,
          customerPhone: d.customer_phone || undefined,
          customerEmail: d.customer_email || undefined,
          items: d.items as any,
          subtotal: Number(d.subtotal),
          tax: d.tax ? Number(d.tax) : undefined,
          total: Number(d.total),
          currency: d.currency as any,
          date: d.date,
          dueDate: d.due_date || undefined,
          status: (d.status as any) || 'draft',
          createdAt: d.created_at,
          notes: d.notes || undefined,
        })));
      }

      if (productsRes.data) {
        setProducts(productsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          costPrice: Number(p.cost_price),
          sellingPrice: Number(p.selling_price),
          currency: p.currency as any,
          quantity: p.quantity,
          category: p.category || undefined,
          isActive: p.is_active,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })));
      }

      if (customersRes.data) {
        setCustomers(customersRes.data.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email || undefined,
          phone: c.phone || undefined,
          address: c.address || undefined,
          notes: c.notes || undefined,
          totalPurchases: Number(c.total_purchases),
          lastPurchaseDate: c.last_purchase_date || undefined,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })));
      }

      if (suppliersRes.data) {
        setSuppliers(suppliersRes.data.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email || undefined,
          phone: s.phone || undefined,
          address: s.address || undefined,
          contactPerson: s.contact_person || undefined,
          notes: s.notes || undefined,
          totalPurchases: Number(s.total_purchases),
          lastPurchaseDate: s.last_purchase_date || undefined,
          paymentTerms: s.payment_terms || undefined,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })));
      }

      if (budgetsRes.data) {
        setBudgets(budgetsRes.data.map(b => ({
          id: b.id,
          name: b.name,
          period: b.period as any,
          categories: b.categories as any,
          totalBudget: Number(b.total_budget),
          currency: b.currency as any,
          startDate: b.start_date,
          endDate: b.end_date,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
        })));
      }

      if (cashflowRes.data) {
        setCashflowProjections(cashflowRes.data.map(c => ({
          id: c.id,
          month: c.month,
          openingBalance: Number(c.opening_balance),
          projectedIncome: Number(c.projected_income),
          projectedExpenses: Number(c.projected_expenses),
          closingBalance: Number(c.closing_balance),
          currency: c.currency as any,
          notes: c.notes || undefined,
          createdAt: c.created_at,
        })));
      }

      if (taxRatesRes.data) {
        setTaxRates(taxRatesRes.data.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type as any,
          rate: Number(t.rate),
          isDefault: t.is_default,
          isActive: t.is_active,
          appliesTo: t.applies_to as any,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })));
      }

      if (employeesRes.data) {
        setEmployees(employeesRes.data.map(e => ({
          id: e.id,
          name: e.name,
          email: e.email || undefined,
          phone: e.phone || undefined,
          role: e.role || undefined,
          position: e.position || undefined,
          hireDate: e.hire_date || undefined,
          salary: e.salary ? Number(e.salary) : undefined,
          currency: e.currency as any,
          isActive: e.is_active,
          notes: e.notes || undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })));
      }

      if (projectsRes.data) {
        setProjects(projectsRes.data.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || undefined,
          clientName: p.client_name || undefined,
          status: p.status as any,
          startDate: p.start_date || undefined,
          endDate: p.end_date || undefined,
          budget: p.budget ? Number(p.budget) : undefined,
          currency: p.currency as any,
          progress: p.progress,
          notes: p.notes || undefined,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })));
      }

      if (projectTasksRes.data) {
        setProjectTasks(projectTasksRes.data.map(t => ({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          description: t.description || undefined,
          status: t.status as any,
          priority: t.priority as any,
          dueDate: t.due_date || undefined,
          assignedTo: t.assigned_to || undefined,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        })));
      }

      if (recurringInvoicesRes.data) {
        setRecurringInvoices(recurringInvoicesRes.data.map(r => ({
          id: r.id,
          customerName: r.customer_name,
          customerEmail: r.customer_email || undefined,
          customerPhone: r.customer_phone || undefined,
          items: r.items as any,
          subtotal: Number(r.subtotal),
          tax: r.tax ? Number(r.tax) : undefined,
          total: Number(r.total),
          currency: r.currency as any,
          frequency: r.frequency as any,
          startDate: r.start_date,
          endDate: r.end_date || undefined,
          nextDueDate: r.next_due_date,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })));
      }

      if (paymentsRes.data) {
        setPayments(paymentsRes.data.map(p => ({
          id: p.id,
          documentId: p.document_id,
          amount: Number(p.amount),
          currency: p.currency as any,
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method as any,
          reference: p.reference || undefined,
          notes: p.notes || undefined,
          createdAt: p.created_at,
        })));
      }

      if (exchangeRateRes.data) {
        setExchangeRate({
          usdToZwl: Number(exchangeRateRes.data.usd_to_zwl),
          lastUpdated: exchangeRateRes.data.created_at,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [userId, loadData]);

  const saveBusiness = async (newBusiness: BusinessProfile) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // First, ensure the user profile exists in the users table
      // This is required because business_profiles has a foreign key constraint on user_id
      // Note: If a database trigger is set up, the profile should be created automatically
      
      // CRITICAL: Ensure user profile exists before creating business profile
      // The foreign key constraint requires the user to exist in the users table
      if (!user && authUser) {
        const provider = getProvider();
        let profileExists = false;
        
        // Step 1: Try RPC function first (most reliable - uses SECURITY DEFINER)
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('sync_user_profile', { 
            user_id_param: authUser.id 
          });
          
          if (rpcData && (rpcData as any).success) {
            console.log('✅ User profile synced via RPC:', (rpcData as any).message);
            profileExists = true;
            // Wait a moment for the insert to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else if (rpcError) {
            const rpcErrorCode = (rpcError as any)?.code || '';
            const rpcErrorMessage = rpcError?.message || String(rpcError);
            // 406/42883 means function doesn't exist - that's okay, try other methods
            if (rpcErrorCode !== '406' && rpcErrorCode !== '42883' && !rpcErrorMessage.includes('function')) {
              console.log('⚠️ RPC sync had an issue:', rpcErrorMessage);
            }
          }
        } catch {
          // RPC might not be available - that's okay, try other methods
        }
        
        // Step 2: Try to read the profile (to verify it exists)
        if (!profileExists) {
          try {
            const profile = await provider.getUserProfile(authUser.id);
            if (profile) {
              console.log('✅ User profile found');
              profileExists = true;
            }
          } catch {
            // Can't read - might not exist or RLS blocking
          }
        }
        
        // Step 3: If still not found, try to create it
        if (!profileExists) {
          try {
            await provider.createUserProfile(authUser.id, {
              email: authUser.email,
              name: authUser.metadata?.name || authUser.email.split('@')[0] || 'User',
              isSuperAdmin: false,
            });
            console.log('✅ User profile created successfully');
            profileExists = true;
          } catch (createError: any) {
            const createErrorMessage = createError?.message || String(createError);
            const createErrorCode = (createError as any)?.code || '';
            
            // Duplicate key means profile EXISTS - that's success!
            if (createErrorMessage.includes('duplicate key') || 
                createErrorMessage.includes('already exists') ||
                createErrorCode === '23505' ||
                createErrorMessage.includes('users_email_key') ||
                createErrorMessage.includes('users_pkey')) {
              console.log('✅ Profile already exists (duplicate key detected)');
              profileExists = true;
            } else if (createErrorMessage.includes('RLS') || 
                       createErrorMessage.includes('row-level security') ||
                       createErrorCode === '42501') {
              // RLS blocks creation - wait for trigger/RPC, then verify
              console.log('⚠️ RLS prevents creation - waiting for trigger/RPC...');
              for (let i = 0; i < 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const checkProfile = await provider.getUserProfile(authUser.id);
                if (checkProfile) {
                  console.log('✅ Profile created by trigger/RPC');
                  profileExists = true;
                  break;
                }
              }
            }
          }
        }
        
        // Step 4: Final verification - check directly in database
        if (!profileExists) {
          try {
            const { data: directCheck, error: directError } = await supabase
              .from('users')
              .select('id')
              .eq('id', authUser.id)
              .single();
            
            if (directCheck && !directError) {
              console.log('✅ Profile exists in database (verified directly)');
              profileExists = true;
            } else {
              // Profile truly doesn't exist - we cannot proceed
              // Provide clear instructions with the exact SQL to run
              const errorMessage = 
                '❌ CRITICAL: User profile does not exist in database.\n\n' +
                'The user profile must exist before creating a business profile.\n\n' +
                'QUICK FIX - Run this in Supabase SQL Editor (select "No limit"):\n\n' +
                'Option 1 - Use RPC function:\n' +
                `SELECT public.sync_user_profile('${authUser.id}'::UUID);\n\n` +
                'Option 2 - Sync all users:\n' +
                'SELECT public.sync_existing_users();\n\n' +
                'Option 3 - Manual insert (if above don\'t work):\n' +
                'See database/emergency_create_user_profile.sql\n\n' +
                'After running one of these, refresh the app and try again.';
              
              console.error(errorMessage);
              throw new Error(errorMessage);
            }
          } catch (verifyError: any) {
            const verifyMsg = verifyError?.message || String(verifyError);
            // If it's a "not found" error, profile doesn't exist
            if (verifyMsg.includes('PGRST116') || verifyMsg.includes('No rows returned') || verifyMsg.includes('does not exist')) {
              throw new Error(
                'User profile does not exist in database and could not be created.\n\n' +
                'SOLUTION:\n' +
                '1. Run the SQL in database/create_user_profile_trigger.sql in Supabase SQL Editor\n' +
                '2. Then run: SELECT public.sync_user_profile(\'' + authUser.id + '\'::UUID);\n' +
                '3. Or run: SELECT public.sync_existing_users();'
              );
            }
            // Re-throw other errors
            throw verifyError;
          }
        }
        
        if (!profileExists) {
          throw new Error('User profile verification failed. Please ensure the database trigger is set up.');
        }
      }
      
      // Verify user_id exists before proceeding
      if (!userId) {
        throw new Error('User authentication required to save business profile');
      }
      
      // At this point, we've done our best to ensure the profile exists
      // If it doesn't, the database's foreign key constraint will catch it
      console.log('✅ Proceeding with business profile creation for user:', userId);

      // Prepare the data object - only include id if it's a valid UUID
      // For new businesses, let the database generate the UUID
      const isExistingBusiness = business?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(business.id);
      
      const upsertData: any = {
        user_id: userId,
          name: newBusiness.name,
          type: newBusiness.type,
          stage: newBusiness.stage,
          location: newBusiness.location,
          capital: newBusiness.capital,
          currency: newBusiness.currency,
          owner: newBusiness.owner,
          phone: newBusiness.phone || null,
          email: newBusiness.email || null,
          address: newBusiness.address || null,
          dream_big_book: newBusiness.dreamBigBook || 'none',
      };

      // Only include id if we have an existing business with a valid UUID
      if (isExistingBusiness) {
        upsertData.id = business.id;
      }

      // Use upsert with user_id as conflict target (since user_id is UNIQUE)
      const { data, error } = await supabase
        .from('business_profiles')
        .upsert(upsertData, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        // Better error message handling
        const errorMessage = error?.message || String(error);
        const errorCode = (error as any)?.code || '';
        const errorDetails = (error as any)?.details || '';
        const errorHint = (error as any)?.hint || '';
        
        // Log with proper stringification (avoid [object Object])
        console.error('Failed to save business:', errorMessage);
        if (errorCode) console.error('Error code:', errorCode);
        if (errorDetails) console.error('Error details:', errorDetails);
        if (errorHint) console.error('Error hint:', errorHint);
        
        // Create a more descriptive error
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorCode;
        (enhancedError as any).details = errorDetails;
        (enhancedError as any).hint = errorHint;
        throw enhancedError;
      }

      // Use the data returned from the database (includes the generated UUID if it was new)
      const savedBusiness: BusinessProfile = {
        id: data.id,
        name: data.name,
        type: data.type as any,
        stage: data.stage as any,
        location: data.location,
        capital: Number(data.capital),
        currency: data.currency as any,
        owner: data.owner,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        dreamBigBook: data.dream_big_book as any,
        createdAt: data.created_at,
      };

      setBusiness(savedBusiness);
      setHasOnboarded(true);
    } catch (error: any) {
      // Better error logging - extract message properly
      let errorMessage = '';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      } else {
        // Try to stringify, but handle circular references
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = 'Unknown error occurred while saving business profile';
        }
      }
      
      const errorCode = error?.code || '';
      const errorDetails = error?.details || '';
      const errorHint = error?.hint || '';
      
      // Log with proper stringification (avoid [object Object])
      console.error('Failed to save business:', errorMessage);
      if (errorCode) console.error('Error code:', errorCode);
      if (errorDetails) console.error('Error details:', errorDetails);
      if (errorHint) console.error('Error hint:', errorHint);
      
      // Create enhanced error with all details
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = errorCode;
      (enhancedError as any).details = errorDetails;
      (enhancedError as any).hint = errorHint;
      throw enhancedError;
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          business_id: business.id,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          category: transaction.category,
          date: transaction.date,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type as any,
        amount: Number(data.amount),
        currency: data.currency as any,
        description: data.description,
        category: data.category,
        date: data.date,
        createdAt: data.created_at,
      };

      setTransactions([newTransaction, ...transactions]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: updates.type,
          amount: updates.amount,
          description: updates.description,
          category: updates.category,
        })
        .eq('id', id);

      if (error) throw error;

      const updated = transactions.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      setTransactions(updated);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  };

  const addDocument = async (document: Omit<Document, 'id' | 'createdAt' | 'documentNumber'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const count = documents.filter(d => d.type === document.type).length + 1;
      let prefix = 'DOC';
      switch (document.type) {
        case 'invoice':
          prefix = 'INV';
          break;
        case 'receipt':
          prefix = 'REC';
          break;
        case 'quotation':
          prefix = 'QUO';
          break;
        case 'purchase_order':
          prefix = 'PO';
          break;
        case 'contract':
          prefix = 'CTR';
          break;
        case 'supplier_agreement':
          prefix = 'SUP';
          break;
        default:
          prefix = 'DOC';
      }
      const documentNumber = `${prefix}-${String(count).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          business_id: business.id,
          type: document.type,
          document_number: documentNumber,
          customer_name: document.customerName,
          customer_phone: document.customerPhone || null,
          customer_email: document.customerEmail || null,
          items: document.items,
          subtotal: document.subtotal,
          tax: document.tax || null,
          total: document.total,
          currency: document.currency,
          date: document.date,
          due_date: document.dueDate || null,
          status: document.status || 'draft',
          notes: document.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newDocument: Document = {
        id: data.id,
        type: data.type as any,
        documentNumber: data.document_number,
        customerName: data.customer_name,
        customerPhone: data.customer_phone || undefined,
        customerEmail: data.customer_email || undefined,
        items: data.items as any,
        subtotal: Number(data.subtotal),
        tax: data.tax ? Number(data.tax) : undefined,
        total: Number(data.total),
        currency: data.currency as any,
        date: data.date,
        dueDate: data.due_date || undefined,
        status: (data.status as any) || 'draft',
        createdAt: data.created_at,
        notes: data.notes || undefined,
      };

      setDocuments([newDocument, ...documents]);
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    try {
      const updateData: any = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
      if (updates.customerEmail !== undefined) updateData.customer_email = updates.customerEmail || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = documents.map(d => 
        d.id === id ? { ...d, ...updates } : d
      );
      setDocuments(updated);
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  };

  const updateExchangeRate = async (rate: number) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert({
          user_id: userId,
          usd_to_zwl: rate,
        })
        .select()
        .single();

      if (error) throw error;

      const newRate: ExchangeRate = {
        usdToZwl: Number(data.usd_to_zwl),
        lastUpdated: data.created_at,
      };
      setExchangeRate(newRate);
    } catch (error) {
      console.error('Failed to update exchange rate:', error);
      throw error;
    }
  };

  // Products Management
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: product.name,
          description: product.description || null,
          cost_price: product.costPrice,
          selling_price: product.sellingPrice,
          currency: product.currency,
          quantity: product.quantity,
          category: product.category || null,
          is_active: product.isActive,
        })
        .select()
        .single();

      if (error) throw error;

      const newProduct: Product = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        costPrice: Number(data.cost_price),
        sellingPrice: Number(data.selling_price),
        currency: data.currency as any,
        quantity: data.quantity,
        category: data.category || undefined,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setProducts([newProduct, ...products]);
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.category !== undefined) updateData.category = updates.category || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = products.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      setProducts(updated);
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  };

  // Customers Management
  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'lastPurchaseDate'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: customer.name,
          email: customer.email || null,
          phone: customer.phone || null,
          address: customer.address || null,
          notes: customer.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newCustomer: Customer = {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        totalPurchases: Number(data.total_purchases),
        lastPurchaseDate: data.last_purchase_date || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setCustomers([newCustomer, ...customers]);
    } catch (error) {
      console.error('Failed to add customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.address !== undefined) updateData.address = updates.address || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = customers.map(c => 
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );
      setCustomers(updated);
    } catch (error) {
      console.error('Failed to update customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCustomers(customers.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      throw error;
    }
  };

  // Suppliers Management
  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchases' | 'lastPurchaseDate'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: supplier.name,
          email: supplier.email || null,
          phone: supplier.phone || null,
          address: supplier.address || null,
          contact_person: supplier.contactPerson || null,
          notes: supplier.notes || null,
          payment_terms: supplier.paymentTerms || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSupplier: Supplier = {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        contactPerson: data.contact_person || undefined,
        notes: data.notes || undefined,
        totalPurchases: Number(data.total_purchases),
        lastPurchaseDate: data.last_purchase_date || undefined,
        paymentTerms: data.payment_terms || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setSuppliers([newSupplier, ...suppliers]);
    } catch (error) {
      console.error('Failed to add supplier:', error);
      throw error;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.address !== undefined) updateData.address = updates.address || null;
      if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.paymentTerms !== undefined) updateData.payment_terms = updates.paymentTerms || null;

      const { error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = suppliers.map(s => 
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      );
      setSuppliers(updated);
    } catch (error) {
      console.error('Failed to update supplier:', error);
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      throw error;
    }
  };

  const getDashboardMetrics = (): DashboardMetrics => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const todayTransactions = transactions.filter(t => t.date.startsWith(today));
    const monthTransactions = transactions.filter(t => t.date >= monthStart);

    const todaySales = todayTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenses = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthSales = monthTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthExpenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryTotals = new Map<string, number>();
    const expenseTotals = new Map<string, number>();
    monthTransactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
      
      if (t.type === 'expense') {
        const expenseCurrent = expenseTotals.get(t.category) || 0;
        expenseTotals.set(t.category, expenseCurrent + t.amount);
      }
    });

    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const alerts: Alert[] = [];
    const userBook = business?.dreamBigBook;
    
    if (monthExpenses > monthSales && monthSales > 0) {
      const chapter = getChapterForTopic(userBook, 'expenses');
      alerts.push({
        id: '1',
        type: 'danger',
        message: 'Expenses exceed sales this month',
        action: 'Urgent: Review and cut costs or increase sales',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    }

    const profitMargin = monthSales > 0 ? ((monthSales - monthExpenses) / monthSales) * 100 : 0;
    if (profitMargin < 20 && profitMargin > 0 && monthSales > 0) {
      const chapter = getChapterForTopic(userBook, 'pricing');
      alerts.push({
        id: '2',
        type: 'warning',
        message: `Low profit margin (${profitMargin.toFixed(1)}%)`,
        action: 'Consider raising prices or reducing costs',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    }

    const cashPosition = (business?.capital || 0) + monthSales - monthExpenses;
    
    if (cashPosition < 0) {
      const chapter = getChapterForTopic(userBook, 'cashflow');
      alerts.push({
        id: '3',
        type: 'danger',
        message: 'Negative cash position',
        action: 'You need to inject capital or reduce expenses immediately',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    } else if (cashPosition > 0 && cashPosition < (business?.capital || 0) * 0.3) {
      const chapter = getChapterForTopic(userBook, 'cash-management');
      alerts.push({
        id: '4',
        type: 'warning',
        message: 'Cash running low (below 30% of starting capital)',
        action: 'Plan for capital injection or focus on profitability',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    }

    const highestExpense = Array.from(expenseTotals.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (highestExpense && highestExpense[1] > monthExpenses * 0.4) {
      const chapter = getChapterForTopic(userBook, 'cost-control');
      alerts.push({
        id: '5',
        type: 'info',
        message: `${highestExpense[0]} is ${((highestExpense[1] / monthExpenses) * 100).toFixed(0)}% of expenses`,
        action: 'Consider if this cost can be optimized',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    }

    if (monthSales === 0 && monthTransactions.length > 0) {
      const chapter = getChapterForTopic(userBook, 'sales');
      alerts.push({
        id: '6',
        type: 'danger',
        message: 'No sales recorded this month',
        action: 'Focus on generating revenue immediately',
        bookReference: chapter ? {
          book: chapter.book,
          chapter: chapter.chapter,
          chapterTitle: chapter.title,
        } : undefined,
      });
    }

    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentTransactions = transactions.filter(t => t.date >= lastWeek);
    
    if (transactions.length > 10 && recentTransactions.length === 0) {
      alerts.push({
        id: '7',
        type: 'warning',
        message: 'No transactions in the last 7 days',
        action: 'Keep your records up to date for accurate tracking',
      });
    }

    return {
      todaySales,
      todayExpenses,
      todayProfit: todaySales - todayExpenses,
      monthSales,
      monthExpenses,
      monthProfit: monthSales - monthExpenses,
      cashPosition,
      topCategories,
      alerts,
    };
  };

  // Budget Management
  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: budget.name,
          period: budget.period,
          categories: budget.categories,
          total_budget: budget.totalBudget,
          currency: budget.currency,
          start_date: budget.startDate,
          end_date: budget.endDate,
        })
        .select()
        .single();

      if (error) throw error;

      const newBudget: Budget = {
        id: data.id,
        name: data.name,
        period: data.period as any,
        categories: data.categories as any,
        totalBudget: Number(data.total_budget),
        currency: data.currency as any,
        startDate: data.start_date,
        endDate: data.end_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setBudgets([newBudget, ...budgets]);
    } catch (error) {
      console.error('Failed to add budget:', error);
      throw error;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.period !== undefined) updateData.period = updates.period;
      if (updates.categories !== undefined) updateData.categories = updates.categories;
      if (updates.totalBudget !== undefined) updateData.total_budget = updates.totalBudget;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

      const { error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = budgets.map(b => 
        b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
      );
      setBudgets(updated);
    } catch (error) {
      console.error('Failed to update budget:', error);
      throw error;
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBudgets(budgets.filter(b => b.id !== id));
    } catch (error) {
      console.error('Failed to delete budget:', error);
      throw error;
    }
  };

  // Cashflow Projections Management
  const addCashflowProjection = async (projection: Omit<CashflowProjection, 'id' | 'createdAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('cashflow_projections')
        .insert({
          user_id: userId,
          business_id: business.id,
          month: projection.month,
          opening_balance: projection.openingBalance,
          projected_income: projection.projectedIncome,
          projected_expenses: projection.projectedExpenses,
          closing_balance: projection.closingBalance,
          currency: projection.currency,
          notes: projection.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newProjection: CashflowProjection = {
        id: data.id,
        month: data.month,
        openingBalance: Number(data.opening_balance),
        projectedIncome: Number(data.projected_income),
        projectedExpenses: Number(data.projected_expenses),
        closingBalance: Number(data.closing_balance),
        currency: data.currency as any,
        notes: data.notes || undefined,
        createdAt: data.created_at,
      };

      setCashflowProjections([...cashflowProjections, newProjection].sort((a, b) => 
        a.month.localeCompare(b.month)
      ));
    } catch (error) {
      console.error('Failed to add cashflow projection:', error);
      throw error;
    }
  };

  const updateCashflowProjection = async (id: string, updates: Partial<CashflowProjection>) => {
    try {
      const updateData: any = {};
      if (updates.month !== undefined) updateData.month = updates.month;
      if (updates.openingBalance !== undefined) updateData.opening_balance = updates.openingBalance;
      if (updates.projectedIncome !== undefined) updateData.projected_income = updates.projectedIncome;
      if (updates.projectedExpenses !== undefined) updateData.projected_expenses = updates.projectedExpenses;
      if (updates.closingBalance !== undefined) updateData.closing_balance = updates.closingBalance;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('cashflow_projections')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = cashflowProjections.map(c => 
        c.id === id ? { ...c, ...updates } : c
      );
      setCashflowProjections(updated.sort((a, b) => a.month.localeCompare(b.month)));
    } catch (error) {
      console.error('Failed to update cashflow projection:', error);
      throw error;
    }
  };

  const deleteCashflowProjection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cashflow_projections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCashflowProjections(cashflowProjections.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete cashflow projection:', error);
      throw error;
    }
  };

  // Tax Rates Management
  const addTaxRate = async (taxRate: Omit<TaxRate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      // If this is default, unset other defaults
      if (taxRate.isDefault) {
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('tax_rates')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: taxRate.name,
          type: taxRate.type,
          rate: taxRate.rate,
          is_default: taxRate.isDefault,
          is_active: taxRate.isActive,
          applies_to: taxRate.appliesTo || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newTaxRate: TaxRate = {
        id: data.id,
        name: data.name,
        type: data.type as any,
        rate: Number(data.rate),
        isDefault: data.is_default,
        isActive: data.is_active,
        appliesTo: data.applies_to as any,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setTaxRates([newTaxRate, ...taxRates]);
    } catch (error) {
      console.error('Failed to add tax rate:', error);
      throw error;
    }
  };

  const updateTaxRate = async (id: string, updates: Partial<TaxRate>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.rate !== undefined) updateData.rate = updates.rate;
      if (updates.isDefault !== undefined) {
        updateData.is_default = updates.isDefault;
        // If setting as default, unset others
        if (updates.isDefault) {
          await supabase
            .from('tax_rates')
            .update({ is_default: false })
            .eq('user_id', userId)
            .eq('is_default', true)
            .neq('id', id);
        }
      }
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.appliesTo !== undefined) updateData.applies_to = updates.appliesTo || null;

      const { error } = await supabase
        .from('tax_rates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = taxRates.map(t => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      setTaxRates(updated);
    } catch (error) {
      console.error('Failed to update tax rate:', error);
      throw error;
    }
  };

  const deleteTaxRate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTaxRates(taxRates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete tax rate:', error);
      throw error;
    }
  };

  // Employees Management
  const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: employee.name,
          email: employee.email || null,
          phone: employee.phone || null,
          role: employee.role || null,
          position: employee.position || null,
          hire_date: employee.hireDate || null,
          salary: employee.salary || null,
          currency: employee.currency || null,
          is_active: employee.isActive,
          notes: employee.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newEmployee: Employee = {
        id: data.id,
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        role: data.role || undefined,
        position: data.position || undefined,
        hireDate: data.hire_date || undefined,
        salary: data.salary ? Number(data.salary) : undefined,
        currency: data.currency as any,
        isActive: data.is_active,
        notes: data.notes || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setEmployees([newEmployee, ...employees]);
    } catch (error) {
      console.error('Failed to add employee:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.role !== undefined) updateData.role = updates.role || null;
      if (updates.position !== undefined) updateData.position = updates.position || null;
      if (updates.hireDate !== undefined) updateData.hire_date = updates.hireDate || null;
      if (updates.salary !== undefined) updateData.salary = updates.salary || null;
      if (updates.currency !== undefined) updateData.currency = updates.currency || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = employees.map(e => 
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      );
      setEmployees(updated);
    } catch (error) {
      console.error('Failed to update employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(employees.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw error;
    }
  };

  // Projects Management
  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: project.name,
          description: project.description || null,
          client_name: project.clientName || null,
          status: project.status,
          start_date: project.startDate || null,
          end_date: project.endDate || null,
          budget: project.budget || null,
          currency: project.currency || null,
          progress: project.progress,
          notes: project.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newProject: Project = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        clientName: data.client_name || undefined,
        status: data.status as any,
        startDate: data.start_date || undefined,
        endDate: data.end_date || undefined,
        budget: data.budget ? Number(data.budget) : undefined,
        currency: data.currency as any,
        progress: data.progress,
        notes: data.notes || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setProjects([newProject, ...projects]);
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.clientName !== undefined) updateData.client_name = updates.clientName || null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate || null;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
      if (updates.budget !== undefined) updateData.budget = updates.budget || null;
      if (updates.currency !== undefined) updateData.currency = updates.currency || null;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = projects.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      setProjects(updated);
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== id));
      // Also delete associated tasks
      setProjectTasks(projectTasks.filter(t => t.projectId !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  // Project Tasks Management
  const addProjectTask = async (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: task.projectId,
          user_id: userId,
          title: task.title,
          description: task.description || null,
          status: task.status,
          priority: task.priority,
          due_date: task.dueDate || null,
          assigned_to: task.assignedTo || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: ProjectTask = {
        id: data.id,
        projectId: data.project_id,
        title: data.title,
        description: data.description || undefined,
        status: data.status as any,
        priority: data.priority as any,
        dueDate: data.due_date || undefined,
        assignedTo: data.assigned_to || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setProjectTasks([newTask, ...projectTasks]);
    } catch (error) {
      console.error('Failed to add project task:', error);
      throw error;
    }
  };

  const updateProjectTask = async (id: string, updates: Partial<ProjectTask>) => {
    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo || null;

      const { error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = projectTasks.map(t => 
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      );
      setProjectTasks(updated);
    } catch (error) {
      console.error('Failed to update project task:', error);
      throw error;
    }
  };

  const deleteProjectTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProjectTasks(projectTasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete project task:', error);
      throw error;
    }
  };

  // Recurring Invoices Management
  const addRecurringInvoice = async (invoice: Omit<RecurringInvoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('recurring_invoices')
        .insert({
          user_id: userId,
          business_id: business.id,
          customer_name: invoice.customerName,
          customer_email: invoice.customerEmail || null,
          customer_phone: invoice.customerPhone || null,
          items: invoice.items,
          subtotal: invoice.subtotal,
          tax: invoice.tax || null,
          total: invoice.total,
          currency: invoice.currency,
          frequency: invoice.frequency,
          start_date: invoice.startDate,
          end_date: invoice.endDate || null,
          next_due_date: invoice.nextDueDate,
          is_active: invoice.isActive,
          notes: null,
        })
        .select()
        .single();

      if (error) throw error;

      const newInvoice: RecurringInvoice = {
        id: data.id,
        customerName: data.customer_name,
        customerEmail: data.customer_email || undefined,
        customerPhone: data.customer_phone || undefined,
        items: data.items as any,
        subtotal: Number(data.subtotal),
        tax: data.tax ? Number(data.tax) : undefined,
        total: Number(data.total),
        currency: data.currency as any,
        frequency: data.frequency as any,
        startDate: data.start_date,
        endDate: data.end_date || undefined,
        nextDueDate: data.next_due_date,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setRecurringInvoices([newInvoice, ...recurringInvoices]);
      await logActivity('recurring_invoice', newInvoice.id, 'created', `Created recurring invoice for ${invoice.customerName}`);
    } catch (error) {
      console.error('Failed to add recurring invoice:', error);
      throw error;
    }
  };

  const updateRecurringInvoice = async (id: string, updates: Partial<RecurringInvoice>) => {
    try {
      const updateData: any = {};
      if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
      if (updates.customerEmail !== undefined) updateData.customer_email = updates.customerEmail || null;
      if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone || null;
      if (updates.items !== undefined) updateData.items = updates.items;
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.tax !== undefined) updateData.tax = updates.tax || null;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate || null;
      if (updates.nextDueDate !== undefined) updateData.next_due_date = updates.nextDueDate;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('recurring_invoices')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const updated = recurringInvoices.map(i => 
        i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
      );
      setRecurringInvoices(updated);
      await logActivity('recurring_invoice', id, 'updated', 'Updated recurring invoice');
    } catch (error) {
      console.error('Failed to update recurring invoice:', error);
      throw error;
    }
  };

  const deleteRecurringInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecurringInvoices(recurringInvoices.filter(i => i.id !== id));
      await logActivity('recurring_invoice', id, 'deleted', 'Deleted recurring invoice');
    } catch (error) {
      console.error('Failed to delete recurring invoice:', error);
      throw error;
    }
  };

  // Payments Management
  const addPayment = async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          business_id: business.id,
          document_id: payment.documentId,
          amount: payment.amount,
          currency: payment.currency,
          payment_date: payment.paymentDate,
          payment_method: payment.paymentMethod,
          reference: payment.reference || null,
          notes: payment.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newPayment: Payment = {
        id: data.id,
        documentId: data.document_id,
        amount: Number(data.amount),
        currency: data.currency as any,
        paymentDate: data.payment_date,
        paymentMethod: data.payment_method as any,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
        createdAt: data.created_at,
      };

      setPayments([newPayment, ...payments]);
      
      // Update document status if fully paid
      const document = documents.find(d => d.id === payment.documentId);
      if (document) {
        const totalPaid = getDocumentPaidAmount(payment.documentId);
        if (totalPaid >= document.total) {
          await updateDocument(payment.documentId, { status: 'paid' });
        }
      }

      await logActivity('payment', newPayment.id, 'created', `Added payment of ${payment.amount} ${payment.currency} for document ${payment.documentId}`);
    } catch (error) {
      console.error('Failed to add payment:', error);
      throw error;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const payment = payments.find(p => p.id === id);
      if (!payment) throw new Error('Payment not found');

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPayments(payments.filter(p => p.id !== id));
      
      // Update document status if no longer fully paid
      const document = documents.find(d => d.id === payment.documentId);
      if (document) {
        const totalPaid = getDocumentPaidAmount(payment.documentId);
        if (totalPaid < document.total && document.status === 'paid') {
          await updateDocument(payment.documentId, { status: 'sent' });
        }
      }

      await logActivity('payment', id, 'deleted', 'Deleted payment');
    } catch (error) {
      console.error('Failed to delete payment:', error);
      throw error;
    }
  };

  const getDocumentPayments = (documentId: string): Payment[] => {
    return payments.filter(p => p.documentId === documentId);
  };

  const getDocumentPaidAmount = (documentId: string): number => {
    return payments
      .filter(p => p.documentId === documentId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Activity Logging
  const logActivity = async (
    entityType: string,
    entityId: string,
    action: string,
    description?: string,
    metadata?: any
  ) => {
    if (!userId || !business?.id) return;

    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          business_id: business.id,
          entity_type: entityType,
          entity_id: entityId,
          action,
          description: description || null,
          metadata: metadata || null,
        });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging should not break the app
    }
  };

  return {
    business,
    transactions,
    documents,
    products,
    customers,
    suppliers,
    budgets,
    cashflowProjections,
    taxRates,
    employees,
    projects,
    projectTasks,
    recurringInvoices,
    payments,
    exchangeRate,
    isLoading,
    hasOnboarded,
    saveBusiness,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDocument,
    updateDocument,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addBudget,
    updateBudget,
    deleteBudget,
    addCashflowProjection,
    updateCashflowProjection,
    deleteCashflowProjection,
    addTaxRate,
    updateTaxRate,
    deleteTaxRate,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addProject,
    updateProject,
    deleteProject,
    addProjectTask,
    updateProjectTask,
    deleteProjectTask,
    addRecurringInvoice,
    updateRecurringInvoice,
    deleteRecurringInvoice,
    addPayment,
    deletePayment,
    getDocumentPayments,
    getDocumentPaidAmount,
    logActivity,
    updateExchangeRate,
    getDashboardMetrics,
  };
});
