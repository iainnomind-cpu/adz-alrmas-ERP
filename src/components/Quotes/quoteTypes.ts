import { round2, splitNetAmount } from '../../lib/tax';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  price_list_id: string | null;
  code: string | null;
  description: string;
  category: string | null;
  quantity: number;
  /** Precio unitario neto (IVA incluido) */
  unit_price: number;
  discount_percent: number;
  line_total: number;
  sort_order: number;
}

export interface QuoteCustomer {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  account_number: number | null;
  system_type: string | null;
  pricing_tier: number | null;
}

export interface Quote {
  id: string;
  folio: string;
  customer_id: string | null;
  prospect_name: string | null;
  prospect_phone: string | null;
  prospect_email: string | null;
  prospect_address: string | null;
  title: string;
  system_type: string | null;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  pricing_tier: number | null;
  tax_rate: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  internal_notes: string | null;
  rejection_reason: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  service_order_id: string | null;
  billing_document_id: string | null;
  calendar_concept_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  customers?: QuoteCustomer | null;
  quote_items?: QuoteItem[];
}

export const QUOTE_SELECT =
  '*, customers (id, name, business_name, phone, email, address, account_number, system_type, pricing_tier), quote_items (*)';

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; badge: string }> = {
  draft: { label: 'Borrador', badge: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Enviada', badge: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Aceptada', badge: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', badge: 'bg-red-100 text-red-800' },
  expired: { label: 'Vencida', badge: 'bg-amber-100 text-amber-800' },
  converted: { label: 'Convertida', badge: 'bg-purple-100 text-purple-800' }
};

export const DEFAULT_QUOTE_TERMS =
  'Precios en pesos mexicanos con IVA incluido. Cotización sujeta a disponibilidad de equipo. ' +
  'Los trabajos se programan una vez aceptada la cotización.';

export const DEFAULT_VALIDITY_DAYS = 15;

export function lineTotal(item: Pick<QuoteItem, 'quantity' | 'unit_price' | 'discount_percent'>): number {
  const gross = (item.quantity || 0) * (item.unit_price || 0);
  return round2(gross * (1 - (item.discount_percent || 0) / 100));
}

/** Totales de la cotización a partir de sus partidas (precios netos). */
export function computeQuoteTotals(items: QuoteItem[], discount: number, taxRatePercent: number) {
  const itemsTotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const total = Math.max(0, round2(itemsTotal - (discount || 0)));
  const { subtotal, tax } = splitNetAmount(total, taxRatePercent / 100);
  return { itemsTotal, subtotal, tax, total };
}

export function quoteClientName(quote: Quote): string {
  return quote.customers?.business_name || quote.customers?.name || quote.prospect_name || 'Sin cliente';
}

export function quoteClientPhone(quote: Quote): string {
  return quote.customers?.phone || quote.prospect_phone || '';
}

export function quoteClientEmail(quote: Quote): string {
  return quote.customers?.email || quote.prospect_email || '';
}

export function quoteClientAddress(quote: Quote): string {
  return quote.customers?.address || quote.prospect_address || '';
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Una cotización enviada cuya vigencia ya pasó. */
export function isQuoteExpired(quote: Pick<Quote, 'status' | 'valid_until'>): boolean {
  return quote.status === 'sent' && !!quote.valid_until && quote.valid_until < todayISO();
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(amount || 0);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  // Las fechas tipo "2026-11-13" se interpretan como fecha local, no UTC
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
