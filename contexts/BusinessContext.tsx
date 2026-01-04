import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { getProvider } from '@/lib/providers';

import type { 
  BusinessProfile, 
  Transaction, 
  Document, 
  DocumentFolder,
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
import { fetchActiveAlertRules, evaluateAlertRules } from '@/lib/alert-evaluator';

export const [BusinessContext, useBusiness] = createContextHook(() => {
  const { user, authUser, isSuperAdmin } = useAuth();
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
    const [folders, setFolders] = useState<DocumentFolder[]>([]);
    const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
      usdToZwl: 25000,
      lastUpdated: new Date().toISOString(),
    });
    const [isLoading, setIsLoading] = useState(true);
    const [hasOnboarded, setHasOnboarded] = useState(false);

  // Get user ID - use authUser.id if available (even if profile not loaded yet)
  const userId = authUser?.id || user?.id;

  const loadData = useCallback(async (businessIdOverride?: string) => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get current business ID - use override if provided, otherwise use existing business state
      const currentBusinessId = businessIdOverride || business?.id;
      
      // Build queries - filter by business_id if business is selected
      // NOTE: Some tables don't have business_id (e.g., project_tasks, exchange_rates)
      // Tables without business_id: project_tasks, exchange_rates
      const tablesWithoutBusinessId = ['project_tasks', 'exchange_rates'];
      const buildQuery = (table: string, orderBy: string, orderDir: 'asc' | 'desc' = 'desc', selectFields?: string) => {
        let query = supabase.from(table);
        if (selectFields) {
          query = query.select(selectFields);
        } else {
          query = query.select('*');
        }
        query = query.eq('user_id', userId);
        // Only filter by business_id if table has that column
        if (currentBusinessId && !tablesWithoutBusinessId.includes(table)) {
          query = query.eq('business_id', currentBusinessId);
        }
        return query.order(orderBy, { ascending: orderDir === 'asc' });
      };
      
      // Build queries with error handling - wrap each in try-catch to prevent one failure from breaking all
      // Add request deduplication to prevent infinite retries
      const queryCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
      const CACHE_TTL = 5000; // 5 seconds cache to prevent duplicate requests
      
      const safeQuery = async (queryPromise: Promise<any>, tableName: string) => {
        const cacheKey = `${tableName}-${userId}-${currentBusinessId || 'no-business'}`;
        const cached = queryCache.get(cacheKey);
        
        // Return cached promise if it's still valid
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.promise;
        }
        
        const queryPromiseWithErrorHandling = (async () => {
          try {
            const result = await queryPromise;
            // Handle 400 Bad Request errors (malformed queries, missing columns, etc.)
            if (result.error) {
              const errorCode = result.error.code || '';
              const errorMessage = result.error.message || '';
              const statusCode = result.error.status || result.error.statusCode || '';
              
              // Check for 400 Bad Request (malformed query, missing column, etc.)
              const is400Error = statusCode === 400 || errorCode === 'PGRST202' || errorMessage.includes('column') && errorMessage.includes('does not exist');
              
              if (is400Error) {
                // Log 400 errors in development - these indicate schema mismatches
                if (__DEV__) {
                  console.error(`400 Bad Request for ${tableName}:`, {
                    error: result.error,
                    message: errorMessage,
                    code: errorCode,
                    hint: 'This usually means the query references a column that does not exist in the table',
                  });
                }
                // Return empty result instead of retrying
                return { data: [], error: null };
              }
              
              // Check for 401 Unauthorized (auth issues)
              const is401Error = statusCode === 401 || errorCode === 'PGRST301';
              if (is401Error) {
                if (__DEV__) {
                  console.error(`401 Unauthorized for ${tableName}:`, {
                    error: result.error,
                    message: errorMessage,
                    hint: 'Session may have expired. User may need to sign in again.',
                  });
                }
                // Return empty result instead of retrying
                return { data: [], error: null };
              }
              
              // Only log unexpected errors, not 404s or missing tables
              const isExpectedError = 
                errorCode === 'PGRST116' || // Not found (OK for optional queries)
                errorCode === '42P01' || // Table doesn't exist
                statusCode === 404 || // HTTP 404
                errorMessage.includes('does not exist') ||
                errorMessage.includes('relation') && errorMessage.includes('does not exist');
              
              if (!isExpectedError) {
                // Only log unexpected errors in development
                if (__DEV__) {
                  console.warn(`Query error for ${tableName}:`, result.error);
                }
              }
            }
            return result;
          } catch (error: any) {
            // Suppress exceptions for missing tables
            const errorMessage = error?.message || '';
            const isExpectedError = 
              errorMessage.includes('does not exist') ||
              errorMessage.includes('relation') && errorMessage.includes('does not exist');
            
            if (!isExpectedError && __DEV__) {
              console.error(`Query exception for ${tableName}:`, error);
            }
            return { data: null, error: { message: error?.message || 'Query failed' } };
          }
        })();
        
        // Cache the promise
        queryCache.set(cacheKey, { promise: queryPromiseWithErrorHandling, timestamp: Date.now() });
        
        // Clean up old cache entries
        if (queryCache.size > 50) {
          const now = Date.now();
          for (const [key, value] of queryCache.entries()) {
            if (now - value.timestamp > CACHE_TTL) {
              queryCache.delete(key);
            }
          }
        }
        
        return queryPromiseWithErrorHandling;
      };

      const [businessRes, transactionsRes, documentsRes, productsRes, customersRes, suppliersRes, budgetsRes, cashflowRes, taxRatesRes, employeesRes, projectsRes, projectTasksRes, recurringInvoicesRes, paymentsRes, foldersRes, exchangeRateRes] = await Promise.all([
        safeQuery(supabase.from('business_profiles').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 'business_profiles'),
        safeQuery(buildQuery('transactions', 'date', 'desc'), 'transactions'),
        safeQuery(buildQuery('documents', 'date', 'desc'), 'documents'),
        safeQuery(buildQuery('products', 'created_at', 'desc'), 'products'),
        safeQuery(buildQuery('customers', 'created_at', 'desc'), 'customers'),
        safeQuery(buildQuery('suppliers', 'created_at', 'desc'), 'suppliers'),
        safeQuery(buildQuery('budgets', 'created_at', 'desc'), 'budgets'),
        safeQuery(buildQuery('cashflow_projections', 'month', 'asc'), 'cashflow_projections'),
        safeQuery(buildQuery('tax_rates', 'created_at', 'desc'), 'tax_rates'),
        safeQuery(buildQuery('employees', 'created_at', 'desc', '*, auth_user_id, role_id, can_login'), 'employees'),
        safeQuery(buildQuery('projects', 'created_at', 'desc'), 'projects'),
        safeQuery(buildQuery('project_tasks', 'created_at', 'desc'), 'project_tasks'),
        safeQuery(buildQuery('recurring_invoices', 'created_at', 'desc'), 'recurring_invoices'),
        safeQuery(buildQuery('payments', 'payment_date', 'desc'), 'payments'),
        safeQuery(buildQuery('document_folders', 'display_order', 'asc'), 'document_folders'),
        safeQuery(
          // exchange_rates table does NOT have business_id column - only user_id
          supabase.from('exchange_rates').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          'exchange_rates'
        ),
      ]);

      // Handle multiple businesses per user - use the most recent one if no business is currently selected
      if (businessRes.data && businessRes.data.length > 0) {
        // Only set business if we don't have one already (to preserve the selected business when switching)
        if (!currentBusinessId) {
          // Get the most recent business (already ordered by created_at DESC)
          const mostRecentBusiness = businessRes.data[0];
          setBusiness({
            id: mostRecentBusiness.id,
            name: mostRecentBusiness.name,
            type: mostRecentBusiness.type as any,
            stage: mostRecentBusiness.stage as any,
            location: mostRecentBusiness.location,
            capital: Number(mostRecentBusiness.capital),
            currency: mostRecentBusiness.currency as any,
            owner: mostRecentBusiness.owner,
            phone: mostRecentBusiness.phone || undefined,
            email: mostRecentBusiness.email || undefined,
            address: mostRecentBusiness.address || undefined,
            dreamBigBook: mostRecentBusiness.dream_big_book as any,
            logo: mostRecentBusiness.logo || undefined,
            createdAt: mostRecentBusiness.created_at,
          });
        }
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
        setDocuments(documentsRes.data.map(d => {
          // Extract employee name from notes if present (backward compatibility)
          let employeeName: string | undefined = undefined;
          if (d.employee_name) {
            employeeName = d.employee_name;
          } else if (d.notes && d.notes.includes('Served by:')) {
            const match = d.notes.match(/Served by:\s*(.+)/);
            if (match) {
              employeeName = match[1].trim();
            }
          }
          
          return {
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
            paymentMethod: d.payment_method as any,
            employeeName: employeeName,
            paidAmount: d.paid_amount ? Number(d.paid_amount) : undefined,
            folderId: d.folder_id || undefined,
          };
        }));
      }

      if (foldersRes.data) {
        // Load document counts for each folder
        const foldersWithCounts = await Promise.all(
          foldersRes.data.map(async (f: any) => {
            const { count } = await supabase
              .from('documents')
              .select('*', { count: 'exact', head: true })
              .eq('folder_id', f.id)
              .eq('user_id', userId);
            
            return {
              id: f.id,
              name: f.name,
              color: f.color || '#0066CC',
              icon: f.icon || 'folder',
              description: f.description || undefined,
              displayOrder: f.display_order || 0,
              createdAt: f.created_at,
              updatedAt: f.updated_at,
              documentCount: count || 0,
            };
          })
        );
        setFolders(foldersWithCounts);
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
          featuredImage: p.featured_image || undefined,
          images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : undefined,
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
        setEmployees(employeesRes.data.map((e: any) => ({
          id: e.id,
          name: e.name,
          authUserId: e.auth_user_id || undefined,
          roleId: e.role_id || undefined,
          canLogin: e.can_login || false,
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

      if (projectTasksRes.data && !projectTasksRes.error) {
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
      } else if (projectTasksRes.error) {
        // Only log in development, suppress expected errors
        if (__DEV__ && projectTasksRes.error.code !== 'PGRST116' && projectTasksRes.error.status !== 404) {
          console.warn('Could not load project tasks:', projectTasksRes.error);
        }
        setProjectTasks([]);
      }

      if (recurringInvoicesRes.data && !recurringInvoicesRes.error) {
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
      } else if (recurringInvoicesRes.error) {
        // Table might not exist or RLS is blocking - set empty array
        // Only log in development, suppress expected errors
        if (__DEV__ && recurringInvoicesRes.error.code !== 'PGRST116' && recurringInvoicesRes.error.status !== 404) {
          console.warn('Could not load recurring invoices:', recurringInvoicesRes.error);
        }
        setRecurringInvoices([]);
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

      if (exchangeRateRes.data && !exchangeRateRes.error) {
        setExchangeRate({
          usdToZwl: Number(exchangeRateRes.data.usd_to_zwl),
          lastUpdated: exchangeRateRes.data.created_at,
        });
      } else if (exchangeRateRes.error && exchangeRateRes.error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is OK - just use default rate
        // Only log unexpected errors in development
        if (__DEV__ && exchangeRateRes.error.status !== 404) {
          console.warn('Could not load exchange rate:', exchangeRateRes.error);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, business?.id]);

  // Clear all business data (called on logout)
  const clearData = useCallback(() => {
    setBusiness(null);
    setTransactions([]);
    setDocuments([]);
    setProducts([]);
    setCustomers([]);
    setSuppliers([]);
    setBudgets([]);
    setCashflowProjections([]);
    setTaxRates([]);
    setEmployees([]);
    setProjects([]);
    setProjectTasks([]);
    setRecurringInvoices([]);
    setPayments([]);
    setFolders([]);
    setExchangeRate({
      usdToZwl: 25000,
      lastUpdated: new Date().toISOString(),
    });
    setHasOnboarded(false);
    setIsLoading(false);
  }, []);

  // Clear data when userId becomes null (user logged out)
  useEffect(() => {
    if (!userId) {
      clearData();
    }
  }, [userId, clearData]);

  // Prevent infinite retries by using ref to track loading state
  const isLoadingRef = useRef(false);
  
  useEffect(() => {
    if (userId && !isLoadingRef.current) {
      isLoadingRef.current = true;
      loadData().finally(() => {
        isLoadingRef.current = false;
      });
    } else if (!userId) {
      setIsLoading(false);
    }
    // Only depend on userId and business?.id, not loadData (which changes on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, business?.id]);

  const saveBusiness = async (newBusiness: BusinessProfile) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // STEP 1: Verify authentication and get fresh session (with retries)
      console.log('🔐 Step 1: Verifying authentication...');
      
      let session: any = null;
      let sessionError: any = null;
      let authUserId: string | null = null;
      
      // Retry getting session up to 5 times (session might not be established immediately after signup)
      for (let retry = 0; retry < 5; retry++) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user && !sessionErr) {
          session = sessionData.session;
          authUserId = session.user.id;
          console.log(`✅ Session verified on attempt ${retry + 1}`);
          break;
        } else {
          sessionError = sessionErr || new Error('No session found');
          console.log(`⚠️ Session not available (attempt ${retry + 1}/5), waiting...`);
          
          // Wait before retrying (exponential backoff: 500ms, 1s, 2s, 3s, 4s)
          if (retry < 4) {
            await new Promise<void>(resolve => setTimeout(() => resolve(), 500 * (retry + 1)));
          }
        }
      }
      
      // If still no session, try refreshing it
      if (!session || !authUserId) {
        console.log('🔄 Attempting to refresh session...');
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user && !refreshError) {
            session = refreshData.session;
            authUserId = session.user.id;
            console.log('✅ Session refreshed successfully');
          }
        } catch (refreshException) {
          console.log('⚠️ Session refresh failed:', refreshException);
        }
      }
      
      // If still no session, try using authUser from context
      if (!authUserId && authUser?.id) {
        console.log('⚠️ Using authUser from context as fallback');
        authUserId = authUser.id;
      }
      
      // Final check - if we still don't have a user ID, throw error
      if (!authUserId) {
        console.error('❌ No valid session found after all retries:', sessionError?.message);
        throw new Error(
          'Unable to verify your session. This usually happens right after signup.\n\n' +
          'SOLUTION:\n' +
          '1. Wait a few seconds and try again\n' +
          '2. Or sign out and sign in again\n' +
          '3. If the problem persists, contact support'
        );
      }

      // Get current user from session or authUser context
      const currentUser = session?.user || authUser;
      
      if (!currentUser) {
        console.error('❌ No user object available');
        throw new Error(
          'User information not available. Please sign out and sign in again.'
        );
      }

      console.log('✅ Session verified for user:', authUserId);
      console.log('✅ Email:', currentUser.email || 'N/A');
      console.log('✅ Email confirmed:', currentUser.email_confirmed_at ? 'Yes' : 'No');

      // STEP 2: Ensure user profile exists in the users table (CRITICAL for foreign key)
      console.log('👤 Step 2: Ensuring user profile exists...');
      
      if (!user && authUser) {
        const provider = getProvider();
        let profileExists = false;
        
        // Method 1: Try RPC function first (most reliable - uses SECURITY DEFINER)
        try {
          console.log('🔄 [2.1] Attempting to sync user profile via RPC function...');
          const { data: rpcData, error: rpcError } = await supabase.rpc('sync_user_profile', { 
            user_id_param: authUserId 
          });
          
          if (rpcData && (rpcData as any).success) {
            console.log('✅ User profile synced via RPC:', (rpcData as any).message);
            profileExists = true;
            // Wait a moment for the insert to complete
            await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
          } else if (rpcError) {
            const rpcErrorCode = (rpcError as any)?.code || '';
            const rpcErrorMessage = rpcError?.message || String(rpcError);
            // 406/42883 means function doesn't exist - that's okay, try other methods
            if (rpcErrorCode !== '406' && rpcErrorCode !== '42883' && !rpcErrorMessage.includes('function')) {
              console.log('⚠️ RPC sync had an issue:', rpcErrorMessage);
            } else {
              console.log('⚠️ RPC function not available - trigger may not be set up');
            }
          }
        } catch (rpcException: any) {
          const rpcExceptionMsg = rpcException?.message || String(rpcException);
          // If function doesn't exist, that's okay - we'll try other methods
          if (!rpcExceptionMsg.includes('function') && !rpcExceptionMsg.includes('does not exist')) {
            console.log('⚠️ RPC exception:', rpcExceptionMsg);
          }
        }
        
        // Method 2: Try to read the profile (to verify it exists)
        if (!profileExists) {
          try {
            const profile = await provider.getUserProfile(authUserId);
            if (profile) {
              console.log('✅ [2.2] User profile found via provider');
              profileExists = true;
            }
          } catch {
            // Can't read - might not exist or RLS blocking
            console.log('⚠️ [2.2] Could not read profile via provider');
          }
        }
        
        // Method 3: If still not found, try to create it via provider
        if (!profileExists) {
          try {
            console.log('🔄 [2.3] Attempting to create user profile via provider...');
            await provider.createUserProfile(authUserId, {
              email: authUser.email,
              name: authUser.metadata?.name || authUser.email.split('@')[0] || 'User',
              isSuperAdmin: false,
            });
            console.log('✅ [2.3] User profile created successfully via provider');
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
              console.log('✅ [2.3] Profile already exists (duplicate key detected)');
              profileExists = true;
            } else if (createErrorMessage.includes('RLS') || 
                       createErrorMessage.includes('row-level security') ||
                       createErrorCode === '42501') {
              // RLS blocks creation - wait for trigger/RPC, then verify
              console.log('⚠️ [2.3] RLS prevents creation - waiting for trigger/RPC...');
              for (let i = 0; i < 3; i++) {
                await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
                const checkProfile = await provider.getUserProfile(authUserId);
                if (checkProfile) {
                  console.log('✅ [2.3] Profile created by trigger/RPC');
                  profileExists = true;
                  break;
                }
              }
            } else {
              console.log('⚠️ [2.3] Profile creation failed:', createErrorMessage);
            }
          }
        }
        
        // Method 4: Final verification - check directly in database with retries
        if (!profileExists) {
          console.log('🔄 [2.4] Final verification - checking if profile exists in database...');
          let verified = false;
          
          // Retry checking multiple times (trigger might be creating it asynchronously)
          for (let retry = 0; retry < 5; retry++) {
            try {
              const { data: directCheck, error: directError } = await supabase
                .from('users')
                .select('id')
                .eq('id', authUserId)
                .single();
              
              if (directCheck && !directError) {
                console.log('✅ [2.4] Profile exists in database (verified directly)');
                profileExists = true;
                verified = true;
                break;
              }
              
              // If not found, wait a bit and try again (trigger might still be processing)
              if (retry < 4) {
                console.log(`⏳ [2.4] Profile not found yet, retrying in 1 second... (attempt ${retry + 1}/5)`);
                await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
              }
            } catch (verifyError: any) {
              const verifyMsg = verifyError?.message || String(verifyError);
              // If it's a "not found" error, continue retrying
              if (verifyMsg.includes('PGRST116') || verifyMsg.includes('No rows returned')) {
                if (retry < 4) {
                  console.log(`⏳ [2.4] Profile not found, retrying... (attempt ${retry + 1}/5)`);
                  await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
                  continue;
                }
              } else {
                // Other error - log and continue
                console.log('⚠️ [2.4] Verification error:', verifyMsg);
              }
            }
          }
          
          // If still not found after all retries, provide clear error
          if (!verified && !profileExists) {
            const errorMessage = 
              'User profile does not exist in database and could not be created automatically.\n\n' +
              'This usually means the database trigger is not set up.\n\n' +
              'QUICK FIX:\n' +
              '1. Go to Supabase Dashboard > SQL Editor\n' +
              '2. Select "No limit" from the dropdown (important!)\n' +
              '3. Copy and paste the ENTIRE contents of database/create_user_profile_trigger.sql\n' +
              '4. Click "Run"\n' +
              '5. Then run this to sync your user:\n' +
              `   SELECT public.sync_user_profile('${authUserId}'::UUID);\n\n` +
              'After running these, refresh the app and try again.';
            
            console.error('❌', errorMessage);
            throw new Error(errorMessage);
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
      
      console.log('✅ Proceeding with business profile creation for user:', userId);

      // STEP 3: Prepare business data
      console.log('💼 Step 4: Preparing business data...');
      console.log('🔄 Saving business profile:');
      console.log('  - user_id (will be used):', authUserId);
      console.log('  - authUserId:', authUserId);
      console.log('  - Match: ✅');

      // STEP 4: Create new business profile using DIRECT INSERT (no RPC)
      // This approach is simpler and more reliable - bypasses all RPC functions
      console.log('📤 Step 4: Creating new business profile using direct INSERT...');
      console.log('  - User ID:', authUserId);
      console.log('  - Business name:', newBusiness.name);
      console.log('  - Business type:', newBusiness.type);
      
      // Optional: Check existing businesses count for plan limits (client-side check)
      // This is optional - we can skip it if plan system doesn't exist
      let existingBusinessCount = 0;
      try {
        const { count } = await supabase
          .from('business_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUserId);
        
        existingBusinessCount = count || 0;
        console.log('  - Existing businesses:', existingBusinessCount);
        
        // Optional: Check plan limits (only if subscription_plans table exists)
        // For now, we'll allow unlimited businesses to avoid errors
        // You can uncomment this later if you want to enforce limits
        /*
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('subscription_plans(max_businesses)')
          .eq('user_id', authUserId)
          .eq('status', 'active')
          .single();
        
        if (subscription?.subscription_plans?.max_businesses) {
          const maxBusinesses = subscription.subscription_plans.max_businesses;
          if (maxBusinesses !== -1 && existingBusinessCount >= maxBusinesses) {
            throw new Error(`Business limit reached. Your plan allows ${maxBusinesses} businesses. Please upgrade your plan to create more businesses.`);
          }
        }
        */
      } catch (limitError: any) {
        // If limit check fails, log but continue (don't block creation)
        console.warn('⚠️ Could not check business limits:', limitError.message);
      }
      
      // DIRECT INSERT - Simple, reliable, no RPC needed, no triggers
      // Use .select() without .maybeSingle() to get array, then take first element
      // This avoids any "query returned more than one row" errors from database side
      const { data: insertDataArray, error: insertError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: authUserId,
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
          logo: newBusiness.logo || null,
        })
        .select(); // Get array, not single row
      
      // Extract first element from array (INSERT always returns array with one element)
      const insertData = insertDataArray && insertDataArray.length > 0 ? insertDataArray[0] : null;

      if (insertError) {
        let errorMessage = '';
        if (typeof insertError === 'string') {
          errorMessage = insertError;
        } else if (insertError?.message) {
          errorMessage = insertError.message;
        } else {
          try {
            errorMessage = JSON.stringify(insertError, null, 2);
          } catch {
            errorMessage = 'Unknown error occurred while creating business profile';
          }
        }
        
        const errorCode = (insertError as any)?.code || '';
        const errorDetails = (insertError as any)?.details || '';
        const errorHint = (insertError as any)?.hint || '';
        
        console.error('❌ Failed to create business profile:');
        console.error('  - Error code:', errorCode || '(none)');
        console.error('  - Error message:', errorMessage);
        console.error('  - Error details:', errorDetails || '(none)');
        console.error('  - Error hint:', errorHint || '(none)');
        console.error('  - Full error object:', insertError);
        
        // Handle "query returned more than one row" error (P0003)
        if (errorCode === 'P0003' || errorMessage.includes('query returned more than one row')) {
          throw new Error(
            'Database error: Multiple rows detected. Please run this SQL script in Supabase SQL Editor:\n\n' +
            '1. Go to Supabase Dashboard > SQL Editor\n' +
            '2. Copy and paste the contents of: database/COMPLETE_DATABASE_CLEANUP.sql\n' +
            '3. Click "Run"\n' +
            '4. Wait for "Database cleanup complete!" message\n' +
            '5. Refresh this app and try again\n\n' +
            'This will remove all triggers and functions causing this error.'
          );
        }
        
        // Handle specific error cases
        if (errorCode === '23505' || errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
          throw new Error('A business with this name already exists. Please use a different name.');
        }
        
        if (errorCode === '42501' || errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
          throw new Error(
            'Permission denied. Please ensure you are logged in correctly and your user profile exists in the database.'
          );
        }
        
        if (errorCode === '23503' || errorMessage.includes('foreign key')) {
          throw new Error(
            'User profile not found. Please sign out and sign in again.'
          );
        }
        
        throw new Error(`Failed to create business profile: ${errorMessage}`);
      }

      if (!insertData) {
        console.error('❌ INSERT returned no data');
        throw new Error('Business profile was created but could not be retrieved. Please refresh the app.');
      }

      const upsertData = insertData;
      console.log('✅ Business profile created successfully');
      console.log('  - Business ID:', upsertData.id);
      console.log('  - Business name:', upsertData.name);

      // STEP 5: Process the result
      // Convert result to BusinessProfile format
      const businessResult = upsertData;
      
      const savedBusiness: BusinessProfile = {
        id: businessResult.id,
        name: businessResult.name,
        type: businessResult.type as any,
        stage: businessResult.stage as any,
        location: businessResult.location,
        capital: Number(businessResult.capital),
        currency: businessResult.currency as any,
        owner: businessResult.owner,
        phone: businessResult.phone || undefined,
        email: businessResult.email || undefined,
        address: businessResult.address || undefined,
        dreamBigBook: businessResult.dream_big_book || businessResult.dreamBigBook || 'none' as any,
        createdAt: businessResult.created_at || businessResult.createdAt,
        logo: businessResult.logo || undefined,
      };

      // STEP 6: Update state
      console.log('💾 Step 6: Updating app state...');
      setBusiness(savedBusiness);
      setHasOnboarded(true);
      
      console.log('✅ Business profile saved successfully!');
      return savedBusiness;
    } catch (error: any) {
      let errorMessage = '';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      } else {
        try {
          errorMessage = JSON.stringify(error, null, 2);
        } catch {
          errorMessage = 'Unknown error occurred while saving business profile';
        }
      }
      
      const errorCode = error?.code || '';
      const errorDetails = error?.details || '';
      
      console.error('❌ Failed to save business profile:');
      console.error('  - Error message:', errorMessage);
      console.error('  - Error code:', errorCode || '(none)');
      console.error('  - Error details:', errorDetails || '(none)');
      
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = errorCode;
      (enhancedError as any).details = errorDetails;
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

      // Include employee name in notes if provided
      let notes = document.notes || '';
      if (document.employeeName) {
        notes = notes ? `${notes}\n\nServed by: ${document.employeeName}` : `Served by: ${document.employeeName}`;
      }

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
          notes: notes || null,
          payment_method: document.paymentMethod || null,
          employee_name: document.employeeName || null,
          discount_amount: (document as any).discountAmount || null,
          amount_received: (document as any).amountReceived || null,
          change_amount: (document as any).changeAmount || null,
          folder_id: document.folderId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Extract employee name from notes if present (backward compatibility)
      let employeeName: string | undefined = undefined;
      if (data.employee_name) {
        employeeName = data.employee_name;
      } else if (data.notes && data.notes.includes('Served by:')) {
        const match = data.notes.match(/Served by:\s*(.+)/);
        if (match) {
          employeeName = match[1].trim();
        }
      }

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
        paymentMethod: data.payment_method as any,
        employeeName: employeeName,
        paidAmount: data.paid_amount ? Number(data.paid_amount) : undefined,
        folderId: data.folder_id || undefined,
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
      if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
      if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.items !== undefined) updateData.items = updates.items;
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.tax !== undefined) updateData.tax = updates.tax || null;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod || null;
      if (updates.employeeName !== undefined) updateData.employee_name = updates.employeeName || null;
      if ((updates as any).discountAmount !== undefined) updateData.discount_amount = (updates as any).discountAmount || null;
      if ((updates as any).amountReceived !== undefined) updateData.amount_received = (updates as any).amountReceived || null;
      if ((updates as any).changeAmount !== undefined) updateData.change_amount = (updates as any).changeAmount || null;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId || null;

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Reload document to get fresh data
      const { data: updatedDoc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (updatedDoc) {
        const oldDocument = documents.find(d => d.id === id);
        const wasPaid = oldDocument?.status === 'paid';
        const isNowPaid = (updatedDoc.status as any) === 'paid';
        const statusChangedToPaid = !wasPaid && isNowPaid;

        const updatedDocument: Document = {
          id: updatedDoc.id,
          type: updatedDoc.type as any,
          documentNumber: updatedDoc.document_number,
          customerName: updatedDoc.customer_name,
          customerPhone: updatedDoc.customer_phone || undefined,
          customerEmail: updatedDoc.customer_email || undefined,
          items: updatedDoc.items as any,
          subtotal: Number(updatedDoc.subtotal),
          tax: updatedDoc.tax ? Number(updatedDoc.tax) : undefined,
          total: Number(updatedDoc.total),
          currency: updatedDoc.currency as any,
          date: updatedDoc.date,
          dueDate: updatedDoc.due_date || undefined,
          status: (updatedDoc.status as any) || 'draft',
          createdAt: updatedDoc.created_at,
          notes: updatedDoc.notes || undefined,
          paymentMethod: updatedDoc.payment_method as any,
          folderId: updatedDoc.folder_id || undefined,
        };

        const updated = documents.map(d => 
          d.id === id ? updatedDocument : d
        );
        setDocuments(updated);

        // If status changed to paid and it's an invoice/receipt, create transaction
        if (statusChangedToPaid && (updatedDocument.type === 'invoice' || updatedDocument.type === 'receipt')) {
          try {
            await addTransaction({
              type: 'sale',
              amount: updatedDocument.total,
              currency: updatedDocument.currency,
              description: `${updatedDocument.type.toUpperCase()} ${updatedDocument.documentNumber} - ${updatedDocument.customerName}`,
              category: 'sales',
              date: updatedDocument.date,
            });
          } catch (error) {
            console.error('Failed to create transaction for paid document:', error);
            // Don't fail the document update if transaction creation fails
          }
        }
      }
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      // First, delete all payments associated with this document
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('document_id', id);

      if (paymentsError) {
        console.warn('Failed to delete associated payments:', paymentsError);
        // Continue with document deletion even if payment deletion fails
      }

      // Delete the document
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
    } catch (error) {
      console.error('Failed to delete document:', error);
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
          featured_image: product.featuredImage || null,
          images: product.images ? JSON.stringify(product.images) : '[]',
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
        featuredImage: data.featured_image || undefined,
        images: data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Ensure we create a new array reference to trigger re-render
      setProducts(prev => [newProduct, ...prev]);
      
      return newProduct;
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
      if (updates.featuredImage !== undefined) updateData.featured_image = updates.featuredImage || null;
      if (updates.images !== undefined) updateData.images = updates.images ? JSON.stringify(updates.images) : '[]';

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

      // Ensure we create a new array reference to trigger re-render
      setCustomers(prev => [newCustomer, ...prev]);
      
      return newCustomer;
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

  const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
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

    // Calculate metrics needed for alerts
    const profitMargin = monthSales > 0 ? ((monthSales - monthExpenses) / monthSales) * 100 : 0;
    const cashPosition = (business?.capital || 0) + monthSales - monthExpenses;

    // Use database alert rules instead of hardcoded logic
    // Completely disable alerts if there's any error to prevent syntax errors
    let evaluatedAlerts: any[] = [];
    
    try {
      // Use static import - already imported at top of file
      if (typeof fetchActiveAlertRules === 'function' && typeof evaluateAlertRules === 'function') {
        const alertRules = await fetchActiveAlertRules();

        // Ensure we have valid metrics before evaluating
        if (alertRules && Array.isArray(alertRules) && alertRules.length > 0) {
          evaluatedAlerts = evaluateAlertRules(alertRules, {
            monthSales: monthSales || 0,
            monthExpenses: monthExpenses || 0,
            monthProfit: (monthSales || 0) - (monthExpenses || 0),
            profitMargin: profitMargin || 0,
            cashPosition: cashPosition || 0,
            transactions: Array.isArray(transactions) ? transactions : [],
            products: Array.isArray(products) ? products : [],
            documents: Array.isArray(documents) ? documents : [],
            business: business || null,
          });
          
          // Validate the result is an array
          if (!Array.isArray(evaluatedAlerts)) {
            evaluatedAlerts = [];
          }
        }
      }
    } catch {
      // Silently fail - don't log errors that might cause issues
      // Just return empty alerts array to prevent any syntax errors from breaking the app
      evaluatedAlerts = [];
    }

    // Convert evaluated alerts to Alert format with validation
    const alerts: Alert[] = (evaluatedAlerts || [])
      .filter((ea: any) => ea && ea.id && ea.message)
      .map((ea: any) => ({
        id: String(ea.id),
        type: ea.type || 'info',
        message: String(ea.message || ''),
        action: ea.action ? String(ea.action) : undefined,
        bookReference: ea.bookReference && typeof ea.bookReference === 'object' ? {
          book: (ea.bookReference.book as any) || 'none',
          chapter: typeof ea.bookReference.chapter === 'number' ? ea.bookReference.chapter : 0,
          chapterTitle: String(ea.bookReference.chapterTitle || ''),
        } : undefined,
      }));

    // Calculate new customers (customers added in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = customers.filter(c => {
      if (!c.createdAt) return false;
      return new Date(c.createdAt) >= thirtyDaysAgo;
    }).length;

    // Calculate sales trend (growth percentage compared to previous period)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
    const previousMonthSales = transactions
      .filter(t => t.type === 'sale' && t.date >= previousMonthStart && t.date <= previousMonthEnd)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const salesTrend = previousMonthSales > 0
      ? Math.round(((monthSales - previousMonthSales) / previousMonthSales) * 100)
      : monthSales > 0 ? 100 : 0;

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
      newCustomers,
      salesTrend,
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
  const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> & { authUserId?: string; roleId?: string; canLogin?: boolean }) => {
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
          auth_user_id: employee.authUserId || null,
          role_id: employee.roleId || null,
          can_login: employee.canLogin || false,
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

  const updateEmployee = async (id: string, updates: Partial<Employee> & { authUserId?: string; roleId?: string; canLogin?: boolean }) => {
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
      if (updates.authUserId !== undefined) updateData.auth_user_id = updates.authUserId || null;
      if (updates.roleId !== undefined) updateData.role_id = updates.roleId || null;
      if (updates.canLogin !== undefined) updateData.can_login = updates.canLogin;

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
          proof_of_payment_url: payment.proofOfPaymentUrl || null,
          verification_status: payment.verificationStatus || 'pending',
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
        proofOfPaymentUrl: data.proof_of_payment_url || undefined,
        verificationStatus: data.verification_status || 'pending',
        verifiedBy: data.verified_by || undefined,
        verifiedAt: data.verified_at || undefined,
        verificationNotes: data.verification_notes || undefined,
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

  // Refresh function to reload all data
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Get all businesses for the user
  const getAllBusinesses = useCallback(async (): Promise<BusinessProfile[]> => {
    if (!userId) return [];

    try {
      // Build query - super admins can see all businesses, regular users only see their own
      let query = supabase
        .from('business_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Only filter by user_id if not a super admin
      if (!isSuperAdmin) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data) return [];

      return data.map((b: any) => ({
        id: b.id,
        name: b.name,
        type: b.type as any,
        stage: b.stage as any,
        location: b.location,
        capital: Number(b.capital),
        currency: b.currency as any,
        owner: b.owner,
        phone: b.phone || undefined,
        email: b.email || undefined,
        address: b.address || undefined,
        dreamBigBook: b.dream_big_book as any,
        logo: b.logo || undefined,
        createdAt: b.created_at,
        // Include user_id for admin views
        userId: b.user_id,
      }));
    } catch (error) {
      console.error('Failed to get all businesses:', error);
      return [];
    }
  }, [userId, isSuperAdmin]);

  // Switch to a different business
  const switchBusiness = useCallback(async (businessId: string) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      // Find the business - super admins can switch to any business
      let query = supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId);
      
      // Only filter by user_id if not a super admin
      if (!isSuperAdmin) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;
      if (!data) throw new Error('Business not found');

      // Update the current business
      const selectedBusiness: BusinessProfile = {
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
        logo: data.logo || undefined,
        createdAt: data.created_at,
      };

      setBusiness(selectedBusiness);
      
      // Reload all data for the new business - pass the businessId directly
      await loadData(businessId);
    } catch (error) {
      console.error('Failed to switch business:', error);
      throw error;
    }
  }, [userId, isSuperAdmin, loadData]);

  // Delete a business
  const deleteBusiness = useCallback(async (businessId: string) => {
    if (!userId) throw new Error('User not authenticated');
    if (business?.id === businessId) {
      throw new Error('Cannot delete the currently active business. Please switch to another business first.');
    }

    try {
      const { error } = await supabase
        .from('business_profiles')
        .delete()
        .eq('id', businessId)
        .eq('user_id', userId);

      if (error) throw error;

      // If we have other businesses, reload data
      // Otherwise, the user will need to create a new business
      await loadData();
    } catch (error) {
      console.error('Failed to delete business:', error);
      throw error;
    }
  }, [userId, business?.id, loadData]);

  // Check if user can create more businesses based on subscription plan
  const checkBusinessLimit = useCallback(async (): Promise<{ canCreate: boolean; currentCount: number; maxBusinesses: number | null; planName: string | null }> => {
    if (!userId) {
      return { canCreate: false, currentCount: 0, maxBusinesses: null, planName: null };
    }

    try {
      // Get current business count
      const { count: currentCount } = await supabase
        .from('business_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      let maxBusinesses: number | null = null;
      let planName: string | null = null;
      let subscriptionDate: string | null = null;
      let trialDate: string | null = null;

      // Check both subscriptions AND trials, then use the most recent/valid one
      
      // Check active subscription
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('start_date, subscription_plans(max_businesses, name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gt.' + new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionData?.subscription_plans) {
        maxBusinesses = (subscriptionData.subscription_plans as any).max_businesses;
        planName = (subscriptionData.subscription_plans as any).name;
        subscriptionDate = subscriptionData.start_date;
      }

      // Check active trial
      const { data: trialData } = await supabase
        .from('premium_trials')
        .select('start_date, subscription_plans(max_businesses, name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (trialData?.subscription_plans) {
        trialDate = trialData.start_date;
        
        // Use trial if it's more recent than subscription, or if there's no subscription
        if (!subscriptionDate || (trialDate && new Date(trialDate) > new Date(subscriptionDate))) {
          maxBusinesses = (trialData.subscription_plans as any).max_businesses;
          planName = (trialData.subscription_plans as any).name;
        }
      }

      // If no plan found, default to Free (1 business)
      if (maxBusinesses === null) {
        maxBusinesses = 1;
        planName = 'Free';
      }

      // -1 means unlimited
      const canCreate = maxBusinesses === -1 || (currentCount || 0) < maxBusinesses;

      return {
        canCreate,
        currentCount: currentCount || 0,
        maxBusinesses,
        planName,
      };
    } catch (error) {
      console.error('Failed to check business limit:', error);
      // Default to allowing creation if check fails
      return { canCreate: true, currentCount: 0, maxBusinesses: null, planName: null };
    }
  }, [userId]);

  // Folder Management Functions
  const loadFolders = useCallback(async () => {
    if (!userId || !business?.id) return;

    try {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', business.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        // Load document counts for each folder
        const foldersWithCounts = await Promise.all(
          data.map(async (f) => {
            const { count } = await supabase
              .from('documents')
              .select('*', { count: 'exact', head: true })
              .eq('folder_id', f.id)
              .eq('user_id', userId);
            
            return {
              id: f.id,
              name: f.name,
              color: f.color || '#0066CC',
              icon: f.icon || 'folder',
              description: f.description || undefined,
              displayOrder: f.display_order || 0,
              createdAt: f.created_at,
              updatedAt: f.updated_at,
              documentCount: count || 0,
            };
          })
        );
        setFolders(foldersWithCounts);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  }, [userId, business?.id]);

  const addFolder = useCallback(async (folder: Omit<DocumentFolder, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          user_id: userId,
          business_id: business.id,
          name: folder.name,
          color: folder.color || '#0066CC',
          icon: folder.icon || 'folder',
          description: folder.description || null,
          display_order: folder.displayOrder || 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newFolder: DocumentFolder = {
        id: data.id,
        name: data.name,
        color: data.color || '#0066CC',
        icon: data.icon || 'folder',
        description: data.description || undefined,
        displayOrder: data.display_order || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        documentCount: 0,
      };

      setFolders([...folders, newFolder]);
      return newFolder;
    } catch (error) {
      console.error('Failed to add folder:', error);
      throw error;
    }
  }, [userId, business?.id, folders]);

  const updateFolder = useCallback(async (id: string, updates: Partial<DocumentFolder>) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

      const { error } = await supabase
        .from('document_folders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Reload folders to get updated counts
      await loadFolders();
    } catch (error) {
      console.error('Failed to update folder:', error);
      throw error;
    }
  }, [userId, business?.id, loadFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    if (!userId || !business?.id) throw new Error('User or business not found');

    try {
      // First, remove folder_id from all documents in this folder
      await supabase
        .from('documents')
        .update({ folder_id: null })
        .eq('folder_id', id)
        .eq('user_id', userId);

      // Then delete the folder
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setFolders(folders.filter(f => f.id !== id));
      
      // Update documents to remove folderId
      setDocuments(documents.map(d => 
        d.folderId === id ? { ...d, folderId: undefined } : d
      ));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  }, [userId, business?.id, folders, documents]);

  // Load folders when business changes
  useEffect(() => {
    if (business?.id) {
      loadFolders();
    }
  }, [business?.id, loadFolders]);

  return {
    business,
    transactions: Array.isArray(transactions) ? transactions : [],
    documents: Array.isArray(documents) ? documents : [],
    products: Array.isArray(products) ? products : [],
    customers: Array.isArray(customers) ? customers : [],
    suppliers: Array.isArray(suppliers) ? suppliers : [],
    budgets: Array.isArray(budgets) ? budgets : [],
    cashflowProjections: Array.isArray(cashflowProjections) ? cashflowProjections : [],
    taxRates: Array.isArray(taxRates) ? taxRates : [],
    employees: Array.isArray(employees) ? employees : [],
    projects: Array.isArray(projects) ? projects : [],
    projectTasks: Array.isArray(projectTasks) ? projectTasks : [],
    recurringInvoices: Array.isArray(recurringInvoices) ? recurringInvoices : [],
    payments: Array.isArray(payments) ? payments : [],
    folders: Array.isArray(folders) ? folders : [],
    exchangeRate: exchangeRate || { usdToZwl: 25000, lastUpdated: new Date().toISOString() },
    isLoading,
    hasOnboarded,
    saveBusiness,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addDocument,
    updateDocument,
    deleteDocument,
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
    refreshData,
    getAllBusinesses,
    switchBusiness,
    deleteBusiness,
    checkBusinessLimit,
    clearData,
    loadFolders,
    addFolder,
    updateFolder,
    deleteFolder,
  };
});


