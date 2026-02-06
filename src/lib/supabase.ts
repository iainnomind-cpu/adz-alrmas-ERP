import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface DigitalCard {
  id: string;
  customer_id: string;
  customer_name: string;
  account_number: number;
  card_number: string;
  card_type: 'titular' | 'familiar';
  cardholder_name: string;
  relationship: string | null;
  qr_code_data: {
    cardNumber: string;
    customerId: string;
    accountNumber: number;
    cardType: string;
    holderName: string;
    validUntil: string | null;
  };
  is_active: boolean;
  block_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardUsage {
  id: string;
  card_id: string;
  used_at: string;
  location: string | null;
  notes: string | null;
}

// Price List Management Types
export interface PriceListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  category: 'dispositivo' | 'sensor' | 'accesorio' | 'material' | 'servicio' | 'mano_obra';
  technology: 'cableado' | 'inalambrico' | 'dual' | 'n/a' | null;
  battery_type: 'recargable' | 'litio' | 'alkalina' | 'n/a' | null;
  currency: 'USD' | 'MXN';
  cost_price_usd: number | null;
  cost_price_mxn: number | null;
  exchange_rate: number;
  supplier_list_price: number | null;
  supplier_discount_percentage: number;
  base_price_mxn: number;
  discount_tier_1: number;
  discount_tier_2: number;
  discount_tier_3: number;
  discount_tier_4: number;
  discount_tier_5: number;
  is_active: boolean;
  is_kit: boolean;
  stock_quantity: number;
  min_stock_level: number;
  supplier_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PriceHistory {
  id: string;
  price_list_id: string;
  old_cost_price_usd: number | null;
  old_cost_price_mxn: number | null;
  old_base_price_mxn: number | null;
  old_exchange_rate: number | null;
  new_cost_price_usd: number | null;
  new_cost_price_mxn: number | null;
  new_base_price_mxn: number | null;
  new_exchange_rate: number | null;
  change_reason: string | null;
  changed_at: string;
  changed_by: string | null;
}
