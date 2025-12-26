import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Access environment variables - Try multiple methods to get the variables
// Hardcoded fallback values to ensure app works
const DEFAULT_SUPABASE_URL = 'https://oqcgerfjjiozltkmmkxf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp';

const supabaseUrl = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  DEFAULT_SUPABASE_ANON_KEY;

// Log which source was used (for debugging)
if (supabaseUrl === DEFAULT_SUPABASE_URL) {
  console.log('📝 Using hardcoded Supabase URL (env vars not loaded)');
} else {
  console.log('✅ Using environment variable for Supabase URL');
}

// No validation needed - we have hardcoded defaults that will always work

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          password_hash: string;
          is_super_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      business_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string;
          stage: string;
          location: string;
          capital: number;
          currency: string;
          owner: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['business_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['business_profiles']['Insert']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          type: string;
          amount: number;
          currency: string;
          description: string;
          category: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>;
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          type: string;
          document_number: string;
          customer_name: string;
          customer_phone: string | null;
          customer_email: string | null;
          items: any;
          subtotal: number;
          tax: number | null;
          total: number;
          currency: string;
          date: string;
          due_date: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
      };
      exchange_rates: {
        Row: {
          id: string;
          user_id: string;
          usd_to_zwl: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['exchange_rates']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['exchange_rates']['Insert']>;
      };
      app_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          notifications_enabled: boolean;
          currency_preference: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['app_settings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>;
      };
      books: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          image_url: string | null;
          features: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['books']['Insert']>;
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          purchased_at: string;
          access_code: string | null;
        };
        Insert: Omit<Database['public']['Tables']['user_books']['Row'], 'id' | 'purchased_at'>;
        Update: Partial<Database['public']['Tables']['user_books']['Insert']>;
      };
      business_plans: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          title: string;
          executive_summary: string | null;
          market_analysis: string | null;
          financial_projections: any;
          content: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['business_plans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['business_plans']['Insert']>;
      };
      viability_calculations: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          capital: number;
          monthly_expenses: number;
          price_per_unit: number;
          cost_per_unit: number;
          expected_sales_per_month: number;
          currency: string;
          break_even_units: number | null;
          break_even_revenue: number | null;
          monthly_profit: number | null;
          months_to_recover_capital: number | null;
          verdict: string | null;
          warnings: any;
          profit_margin: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['viability_calculations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['viability_calculations']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          action: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          name: string;
          description: string | null;
          cost_price: number;
          selling_price: number;
          currency: string;
          quantity: number;
          category: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          name: string;
          period: string;
          categories: any;
          total_budget: number;
          currency: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
      };
      cashflow_projections: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          month: string;
          opening_balance: number;
          projected_income: number;
          projected_expenses: number;
          closing_balance: number;
          currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cashflow_projections']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cashflow_projections']['Insert']>;
      };
    };
  };
};
