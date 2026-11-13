import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import {
  X, Printer, Send, CheckCircle2, XCircle, Edit2, Copy, Trash2, Wrench, Receipt,
  CalendarPlus, MessageCircle, Mail, Loader2, AlertCircle, UserPlus, RotateCcw, FileText
} from 'lucide-react';
import { formatPercent, round2 } from '../../lib/tax';
import { describeSupabaseError, isDuplicateError } from '../../lib/supabaseErrors';
import { getNextAppFolio } from '../../lib/folios';
import { getSystemTypeLabel } from '../../constants/systemTypes';
import { NewCustomerForm } from '../CRM/NewCustomerForm';
import {
  type Quote, type QuoteStatus, QUOTE_SELECT, QUOTE_STATUS_META,
  quoteClientName, quoteClientPhone, quoteClientEmail, quoteClientAddress,
  isQuoteExpired, formatMoney, formatDate, todayISO
} from './quoteTypes';

interface QuoteDetailProps {
  quoteId: string;
  onClose: () => void;
  /** Se llama cuando la cotización cambió, para refrescar la lista. */
  onChanged: () => void;
  onEdit: (quote: Quote) => void;
  onDuplicate: (quote: Quote) => void;
}

interface FolioSeries { id: string; series_name: string; series_code: string; next_number: number }
interface Technician { id: string; full_name: string }

const SERVICE_TYPES = [
  { value: 'installation', label: 'Instalación' },
  { value: 'reactive', label: 'Reactivo' },
  { value: 'preventive', label: 'Preventivo' },
  { value: 'corrective', label: 'Correctivo' },
  { value: 'upgrade', label: 'Mejora' }
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function QuoteDetail({ quoteId, onClose, onChanged, onEdit, onDuplicate }: QuoteDetailProps) {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = isAdmin || hasPermission('quotes', 'edit');
  const canDelete = isAdmin || hasPermission('quotes', 'delete');

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Enlaces a otros módulos
  const [linkedOrder, setLinkedOrder] = useState<{ order_number: string; status: string } | null>(null);
  const [linkedDocument, setLinkedDocument] = useState<{ folio: string; payment_status: string } | null>(null);

  // Conversión a orden de servicio
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [series, setSeries] = useState<FolioSeries[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orderForm, setOrderForm] = useState({
    series_id: '', technician_id: '', service_type: 'installation', priority: 'normal', scheduled_date: ''
  });

  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const loadQuote = async () => {
    setLoading(true);
    try {
      const { data, error: loadError } = await (supabase.from('quotes') as any)
        .select(QUOTE_SELECT)
        .eq('id', quoteId)
        .single();
      if (loadError) throw loadError;
      const q = data as Quote;
      q.quote_items = [...(q.quote_items || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setQuote(q);

      if (q.service_order_id) {
        const { data: order } = await (supabase.from('service_orders') as any)
          .select('order_number, status').eq('id', q.service_order_id).maybeSingle();
        setLinkedOrder(order || null);
      } else {
        setLinkedOrder(null);
      }
      if (q.billing_document_id) {
        const { data: doc } = await (supabase.from('billing_documents') as any)
          .select('folio, payment_status').eq('id', q.billing_document_id).maybeSingle();
        setLinkedDocument(doc || null);
      } else {
        setLinkedDocument(null);
      }
    } catch (err) {
      console.error('Error cargando cotización:', err);
      setError(describeSupabaseError(err, 'Error al cargar la cotización'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      console.error(`Error (${label}):`, err);
      setError(describeSupabaseError(err, 'No se pudo completar la acción'));
    } finally {
      setBusy('');
    }
  };

  const updateQuote = async (changes: Record<string, unknown>) => {
    const { data, error: updateError } = await (supabase.from('quotes') as any)
      .update(changes).eq('id', quoteId).select('id');
    if (updateError) throw updateError;
    if (!data || data.length === 0) throw { code: '42501', message: 'No se actualizó ningún registro' };
    await loadQuote();
    onChanged();
  };

  const setStatus = (status: QuoteStatus, extra: Record<string, unknown> = {}) =>
    run(status, () => updateQuote({ status, ...extra }));

  const handleReject = () => {
    const reason = window.prompt('Motivo del rechazo (opcional):', '');
    if (reason === null) return;
    setStatus('rejected', { rejected_at: new Date().toISOString(), rejection_reason: reason.trim() || null });
  };

  const handleDelete = () => {
    if (!quote) return;
    if (!window.confirm(`¿Eliminar la cotización ${quote.folio}? Esta acción no se puede deshacer.`)) return;
    run('delete', async () => {
      const { data, error: deleteError } = await (supabase.from('quotes') as any).delete().eq('id', quoteId).select('id');
      if (deleteError) throw deleteError;
      if (!data || data.length === 0) throw { code: '42501', message: 'No se eliminó ningún registro' };
      onChanged();
      onClose();
    });
  };

  // ── Compartir ──
  const buildMessage = (q: Quote): string => {
    const lines = (q.quote_items || []).map(i => `• ${i.quantity} x ${i.description}: ${formatMoney(Number(i.line_total))}`);
    return [
      `Hola ${quoteClientName(q)}, le compartimos la cotización ${q.folio} de Alarmas ADZ.`,
      '',
      q.title,
      ...lines,
      '',
      `Total (IVA incluido): ${formatMoney(Number(q.total))}`,
      q.valid_until ? `Vigencia: ${formatDate(q.valid_until)}` : '',
      q.notes || ''
    ].filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== '')).join('\n').trim();
  };

  const markSentIfDraft = async (q: Quote) => {
    if (q.status === 'draft') {
      await updateQuote({ status: 'sent', sent_at: new Date().toISOString() });
    }
  };

  const handleWhatsApp = () => {
    if (!quote) return;
    let digits = quoteClientPhone(quote).replace(/\D/g, '');
    if (!digits) {
      setError('El cliente no tiene teléfono registrado.');
      return;
    }
    if (digits.length === 10) digits = `52${digits}`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(buildMessage(quote))}`, '_blank', 'noopener');
    run('whatsapp', () => markSentIfDraft(quote));
  };

  const handleEmail = () => {
    if (!quote) return;
    const email = quoteClientEmail(quote);
    if (!email) {
      setError('El cliente no tiene correo registrado.');
      return;
    }
    const subject = `Cotización ${quote.folio} - Alarmas ADZ`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage(quote))}`;
    run('email', () => markSentIfDraft(quote));
  };

  const handlePrint = () => {
    if (!quote) return;
    const q = quote;
    const rows = (q.quote_items || []).map(i => `
      <tr>
        <td>${escapeHtml(i.description)}${i.code ? `<div class="code">${escapeHtml(i.code)}</div>` : ''}</td>
        <td class="num">${Number(i.quantity)}</td>
        <td class="num">${formatMoney(Number(i.unit_price))}</td>
        <td class="num">${Number(i.discount_percent) > 0 ? `${formatPercent(Number(i.discount_percent))}%` : '—'}</td>
        <td class="num">${formatMoney(Number(i.line_total))}</td>
      </tr>`).join('');

    const contact = [quoteClientPhone(q), quoteClientEmail(q)].filter(Boolean).join(' · ');
    const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Cotización ${escapeHtml(q.folio)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 32px; font-size: 13px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; }
  header img { height: 64px; }
  h1 { font-size: 22px; margin: 0; color: #1d4ed8; }
  .folio { font-size: 16px; font-weight: bold; }
  .muted { color: #6b7280; }
  .box { margin-top: 18px; }
  .box h2 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin: 0 0 4px; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { text-align: left; background: #f3f4f6; padding: 8px; font-size: 11px; text-transform: uppercase; color: #374151; }
  td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .code { font-size: 10px; color: #9ca3af; }
  .totals { margin-top: 16px; margin-left: auto; width: 280px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals .grand { border-top: 2px solid #111827; margin-top: 6px; padding-top: 8px; font-size: 17px; font-weight: bold; }
  .notes { margin-top: 24px; white-space: pre-wrap; }
  footer { margin-top: 40px; font-size: 11px; color: #6b7280; text-align: center; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<header>
  <div>
    <img src="${window.location.origin}/logo.png" alt="Alarmas ADZ" onerror="this.style.display='none'">
    <div class="muted">Alarmas ADZ</div>
  </div>
  <div style="text-align:right">
    <h1>COTIZACIÓN</h1>
    <div class="folio">${escapeHtml(q.folio)}</div>
    <div class="muted">Fecha: ${formatDate(q.issue_date)}</div>
    ${q.valid_until ? `<div class="muted">Vigencia: ${formatDate(q.valid_until)}</div>` : ''}
  </div>
</header>
<div class="box">
  <h2>Cliente</h2>
  <strong>${escapeHtml(quoteClientName(q))}</strong>
  ${contact ? `<div>${escapeHtml(contact)}</div>` : ''}
  ${quoteClientAddress(q) ? `<div>${escapeHtml(quoteClientAddress(q))}</div>` : ''}
</div>
<div class="box">
  <h2>Concepto</h2>
  <strong>${escapeHtml(q.title)}</strong>
  ${q.system_type ? `<span class="muted"> — ${escapeHtml(getSystemTypeLabel(q.system_type))}</span>` : ''}
</div>
<table>
  <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Desc.</th><th class="num">Importe</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  ${Number(q.discount) > 0 ? `<div><span>Descuento</span><span>- ${formatMoney(Number(q.discount))}</span></div>` : ''}
  <div><span>Subtotal</span><span>${formatMoney(Number(q.subtotal))}</span></div>
  <div><span>IVA (${formatPercent(Number(q.tax_rate))}%)</span><span>${formatMoney(Number(q.tax))}</span></div>
  <div class="grand"><span>Total</span><span>${formatMoney(Number(q.total))}</span></div>
</div>
${q.notes ? `<div class="notes"><h2 class="muted" style="font-size:12px;text-transform:uppercase">Notas</h2>${escapeHtml(q.notes)}</div>` : ''}
${q.terms ? `<div class="notes"><h2 class="muted" style="font-size:12px;text-transform:uppercase">Condiciones</h2>${escapeHtml(q.terms)}</div>` : ''}
<footer>Elaboró: ${escapeHtml(q.created_by_name || 'Alarmas ADZ')}</footer>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes para este sitio.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ── Convertir a orden de servicio ──
  const openOrderPanel = async () => {
    setShowOrderPanel(true);
    const [seriesRes, techRes] = await Promise.all([
      (supabase.from('folio_series') as any)
        .select('id, series_name, series_code, next_number')
        .eq('is_active', true).eq('document_type', 'service_order').order('series_name'),
      (supabase.from('technicians') as any).select('id, full_name').eq('is_active', true).order('full_name')
    ]);
    const seriesList: FolioSeries[] = seriesRes.data || [];
    setSeries(seriesList);
    setTechnicians(techRes.data || []);
    setOrderForm(prev => ({ ...prev, series_id: prev.series_id || seriesList[0]?.id || '' }));
  };

  const itemsAsText = (q: Quote): string =>
    (q.quote_items || []).map(i => `- ${Number(i.quantity)} x ${i.description}${i.code ? ` [${i.code}]` : ''}`).join('\n');

  const handleCreateOrder = () => {
    if (!quote?.customer_id) return;
    const q = quote;
    const selectedSeries = series.find(s => s.id === orderForm.series_id);
    if (!selectedSeries) {
      setError('Selecciona una serie de folios. Si no hay ninguna, créala en Configuración → Series de folios.');
      return;
    }
    const technicianId = orderForm.technician_id || user?.id;
    if (!technicianId) {
      setError('Selecciona un técnico.');
      return;
    }

    run('order', async () => {
      const orderNumber = `${selectedSeries.series_code}-${String(selectedSeries.next_number).padStart(6, '0')}`;
      const { data: order, error: orderError } = await (supabase.from('service_orders') as any)
        .insert([{
          order_number: orderNumber,
          full_folio: orderNumber,
          folio_series_id: selectedSeries.id,
          customer_id: q.customer_id,
          technician_id: technicianId,
          description: `${q.title} (Cotización ${q.folio})`,
          priority: orderForm.priority,
          service_type: orderForm.service_type,
          travel_zone: 'local',
          technician_count: 1,
          scheduled_date: orderForm.scheduled_date ? new Date(`${orderForm.scheduled_date}T09:00:00`).toISOString() : null,
          system_type: q.system_type || null,
          status: 'levantada',
          // Los materiales se agregan en la orden al surtirlos, para descontar existencias del almacén correcto
          notes: `Generada desde la cotización ${q.folio} por ${formatMoney(Number(q.total))} (IVA incluido).\n` +
            `Productos y servicios cotizados:\n${itemsAsText(q)}`,
          created_by_name: (user as any)?.user_metadata?.full_name || user?.email || 'Sistema',
          created_at_display: new Date().toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
          })
        }])
        .select('id')
        .single();
      if (orderError) throw orderError;

      await (supabase.from('folio_series') as any)
        .update({ next_number: selectedSeries.next_number + 1 })
        .eq('id', selectedSeries.id);

      await updateQuote({
        status: 'converted',
        service_order_id: order.id,
        accepted_at: q.accepted_at || new Date().toISOString()
      });
      setShowOrderPanel(false);
      setNotice(`Se creó la orden de servicio ${orderNumber}. Ya aparece en Órdenes de Servicio y en el Calendario.`);
    });
  };

  // ── Generar documento de cobro ──
  const handleCreateBillingDocument = () => {
    if (!quote?.customer_id) return;
    const q = quote;
    if (!window.confirm(`Se generará un documento de cobro por ${formatMoney(Number(q.total))} para ${quoteClientName(q)}. ¿Continuar?`)) return;

    run('billing', async () => {
      const today = todayISO();
      let insertError: any = null;
      let created: { id: string; folio: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const folio = await getNextAppFolio();
        const { data, error: err } = await (supabase.from('billing_documents') as any)
          .insert([{
            customer_id: q.customer_id,
            folio,
            document_type: 'ticket_remision',
            issue_date: today,
            due_date: today,
            concept: `Cotización ${q.folio} - ${q.title}`.slice(0, 250),
            description: itemsAsText(q),
            subtotal: round2(Number(q.subtotal)),
            tax: round2(Number(q.tax)),
            discount: round2(Number(q.discount)),
            total: round2(Number(q.total)),
            balance: round2(Number(q.total)),
            payment_status: 'pending'
          }])
          .select('id, folio')
          .single();
        insertError = err;
        if (!err) {
          created = data;
          break;
        }
        if (!isDuplicateError(err)) break;
      }
      if (insertError || !created) throw insertError;

      await updateQuote({
        billing_document_id: created.id,
        status: q.status === 'converted' ? 'converted' : 'accepted',
        accepted_at: q.accepted_at || new Date().toISOString()
      });
      setNotice(`Se generó el documento ${created.folio}. Ya aparece en Facturación como pendiente de cobro.`);
    });
  };

  // ── Seguimiento en calendario ──
  const handleCreateFollowUp = () => {
    if (!quote || !user) return;
    const q = quote;
    run('calendar', async () => {
      const { data, error: conceptError } = await (supabase.from('calendar_concepts') as any)
        .insert([{
          concept_type: 'quote',
          title: `Seguimiento ${q.folio} - ${quoteClientName(q)}`.slice(0, 200),
          description: `${q.title}. Total ${formatMoney(Number(q.total))}.`,
          duration_minutes: 30,
          customer_id: q.customer_id,
          estimated_amount: round2(Number(q.total)),
          priority: 'medium',
          notes: quoteClientPhone(q) ? `Tel. ${quoteClientPhone(q)}` : null,
          is_scheduled: false,
          created_by: user.id
        }])
        .select('id')
        .single();
      if (conceptError) throw conceptError;
      await updateQuote({ calendar_concept_id: data.id });
      setNotice('Se creó el seguimiento. Está en el panel de conceptos del Calendario; arrástralo al día en que quieras llamar al cliente.');
    });
  };

  // ── Prospecto → cliente ──
  const handleCustomerCreated = () => {
    if (!quote) return;
    const q = quote;
    run('customer', async () => {
      let query = (supabase.from('customers') as any)
        .select('id')
        .eq('name', q.prospect_name)
        .order('created_at', { ascending: false })
        .limit(1);
      if (q.prospect_phone) query = query.eq('phone', q.prospect_phone);
      const { data, error: findError } = await query;
      if (findError) throw findError;
      if (!data || data.length === 0) {
        setNotice('El cliente se guardó, pero no se pudo ligar solo a la cotización (cambió el nombre o el teléfono). Edita la cotización y selecciónalo.');
        return;
      }
      await updateQuote({ customer_id: data[0].id });
      setNotice('El prospecto quedó registrado como cliente y ligado a esta cotización.');
    });
  };

  if (loading || !quote) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          {error ? (
            <>
              <p className="text-red-700 mb-4">{error}</p>
              <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">Cerrar</button>
            </>
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          )}
        </div>
      </div>
    );
  }

  const expired = isQuoteExpired(quote);
  const statusMeta = expired ? QUOTE_STATUS_META.expired : QUOTE_STATUS_META[quote.status];
  const isOpen = ['draft', 'sent', 'expired'].includes(quote.status);
  const isProspect = !quote.customer_id;
  const canConvert = ['sent', 'accepted', 'expired', 'draft'].includes(quote.status) && !quote.service_order_id;
  const actionButton = 'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10 gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {quote.folio}
              </h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.badge}`}>{statusMeta.label}</span>
            </div>
            <p className="text-gray-700 mt-1 truncate">{quote.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /><span>{notice}</span>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePrint} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button onClick={handleWhatsApp} disabled={!!busy} className={`${actionButton} bg-green-600 text-white hover:bg-green-700`}>
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button onClick={handleEmail} disabled={!!busy} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
              <Mail className="w-4 h-4" /> Correo
            </button>
            {canEdit && quote.status === 'draft' && (
              <button onClick={() => setStatus('sent', { sent_at: new Date().toISOString() })} disabled={!!busy} className={`${actionButton} bg-blue-600 text-white hover:bg-blue-700`}>
                <Send className="w-4 h-4" /> Marcar enviada
              </button>
            )}
            {canEdit && isOpen && (
              <>
                <button onClick={() => setStatus('accepted', { accepted_at: new Date().toISOString() })} disabled={!!busy} className={`${actionButton} bg-emerald-600 text-white hover:bg-emerald-700`}>
                  <CheckCircle2 className="w-4 h-4" /> Aceptada
                </button>
                <button onClick={handleReject} disabled={!!busy} className={`${actionButton} bg-red-50 text-red-700 hover:bg-red-100`}>
                  <XCircle className="w-4 h-4" /> Rechazada
                </button>
              </>
            )}
            {canEdit && ['rejected', 'accepted'].includes(quote.status) && !quote.service_order_id && !quote.billing_document_id && (
              <button onClick={() => setStatus('draft', { rejection_reason: null })} disabled={!!busy} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
                <RotateCcw className="w-4 h-4" /> Reabrir
              </button>
            )}
            {canEdit && isOpen && (
              <button onClick={() => onEdit(quote)} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            )}
            <button onClick={() => onDuplicate(quote)} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
              <Copy className="w-4 h-4" /> Duplicar
            </button>
            {canDelete && !quote.service_order_id && !quote.billing_document_id && (
              <button onClick={handleDelete} disabled={!!busy} className={`${actionButton} bg-red-50 text-red-700 hover:bg-red-100`}>
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            )}
            {busy && <Loader2 className="w-5 h-5 animate-spin text-blue-600 self-center" />}
          </div>

          {/* ── Siguiente paso: conectar con otros módulos ── */}
          {canEdit && quote.status !== 'rejected' && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Siguiente paso</h3>

              {isProspect ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">
                    Esta cotización es de un prospecto. Regístralo como cliente para poder generar la orden de servicio o el cobro.
                  </p>
                  <button onClick={() => setShowCustomerForm(true)} className={`${actionButton} bg-blue-600 text-white hover:bg-blue-700`}>
                    <UserPlus className="w-4 h-4" /> Registrar como cliente
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {canConvert && (
                    <button onClick={openOrderPanel} disabled={!!busy} className={`${actionButton} bg-blue-600 text-white hover:bg-blue-700`}>
                      <Wrench className="w-4 h-4" /> Crear orden de servicio
                    </button>
                  )}
                  {!quote.billing_document_id && (
                    <button onClick={handleCreateBillingDocument} disabled={!!busy} className={`${actionButton} bg-white text-gray-800 border border-gray-300 hover:bg-gray-50`}>
                      <Receipt className="w-4 h-4" /> Generar documento de cobro
                    </button>
                  )}
                </div>
              )}

              {isOpen && !quote.calendar_concept_id && (
                <button onClick={handleCreateFollowUp} disabled={!!busy} className={`${actionButton} bg-white text-gray-800 border border-gray-300 hover:bg-gray-50`}>
                  <CalendarPlus className="w-4 h-4" /> Agendar seguimiento en el calendario
                </button>
              )}

              {(linkedOrder || linkedDocument || quote.calendar_concept_id) && (
                <ul className="text-sm text-gray-700 space-y-1">
                  {linkedOrder && <li>🔧 Orden de servicio <strong>{linkedOrder.order_number}</strong> ({linkedOrder.status})</li>}
                  {linkedDocument && <li>🧾 Documento de cobro <strong>{linkedDocument.folio}</strong> ({linkedDocument.payment_status === 'paid' ? 'pagado' : 'pendiente'})</li>}
                  {quote.calendar_concept_id && <li>📅 Seguimiento creado en el calendario</li>}
                </ul>
              )}

              {showOrderPanel && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Serie de folios *</label>
                      <select value={orderForm.series_id} onChange={(e) => setOrderForm({ ...orderForm, series_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Seleccionar...</option>
                        {series.map(s => (
                          <option key={s.id} value={s.id}>{s.series_name} ({s.series_code}-{String(s.next_number).padStart(6, '0')})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Técnico</label>
                      <select value={orderForm.technician_id} onChange={(e) => setOrderForm({ ...orderForm, technician_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Yo mismo</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de servicio</label>
                      <select value={orderForm.service_type} onChange={(e) => setOrderForm({ ...orderForm, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
                      <select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="low">Baja</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha programada</label>
                      <input type="date" value={orderForm.scheduled_date} onChange={(e) => setOrderForm({ ...orderForm, scheduled_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    La orden lleva la lista de lo cotizado en sus notas. Los materiales se agregan en la orden al surtirlos, para que las existencias se descuenten del almacén correcto.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowOrderPanel(false)} className={`${actionButton} bg-gray-100 text-gray-800 hover:bg-gray-200`}>Cancelar</button>
                    <button onClick={handleCreateOrder} disabled={!!busy} className={`${actionButton} bg-blue-600 text-white hover:bg-blue-700`}>
                      {busy === 'order' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />} Crear orden
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Datos ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">{isProspect ? 'Prospecto' : 'Cliente'}</h3>
              <p className="font-semibold text-gray-900">{quoteClientName(quote)}</p>
              <p className="text-gray-600">{[quoteClientPhone(quote), quoteClientEmail(quote)].filter(Boolean).join(' • ') || 'Sin datos de contacto'}</p>
              {quoteClientAddress(quote) && <p className="text-gray-600">{quoteClientAddress(quote)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Emisión</h3>
                <p className="text-gray-900">{formatDate(quote.issue_date)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Vigencia</h3>
                <p className={expired ? 'text-amber-700 font-semibold' : 'text-gray-900'}>{formatDate(quote.valid_until)}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Sistema</h3>
                <p className="text-gray-900">{quote.system_type ? getSystemTypeLabel(quote.system_type) : '—'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Elaboró</h3>
                <p className="text-gray-900">{quote.created_by_name || '—'}</p>
              </div>
            </div>
          </div>

          {/* ── Partidas ── */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Descripción</th>
                  <th className="text-right px-4 py-2 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2 font-medium">Precio neto</th>
                  <th className="text-right px-4 py-2 font-medium">Desc.</th>
                  <th className="text-right px-4 py-2 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {(quote.quote_items || []).map((item, i) => (
                  <tr key={item.id || i} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <span className="text-gray-900">{item.description}</span>
                      {item.code && <span className="block text-xs text-gray-400">{item.code}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">{Number(item.quantity)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{formatMoney(Number(item.unit_price))}</td>
                    <td className="px-4 py-2 text-right">{Number(item.discount_percent) > 0 ? `${formatPercent(Number(item.discount_percent))}%` : '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">{formatMoney(Number(item.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              {Number(quote.discount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Descuento:</span><span className="text-red-600">- {formatMoney(Number(quote.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span><span className="text-gray-900">{formatMoney(Number(quote.subtotal))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA ({formatPercent(Number(quote.tax_rate))}%):</span><span className="text-gray-900">{formatMoney(Number(quote.tax))}</span>
              </div>
              <div className="flex justify-between items-baseline border-t border-gray-200 pt-2">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-gray-900">{formatMoney(Number(quote.total))}</span>
              </div>
            </div>
          </div>

          {(quote.notes || quote.terms || quote.internal_notes || quote.rejection_reason) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {quote.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Notas para el cliente</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Condiciones</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.terms}</p>
                </div>
              )}
              {quote.internal_notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-yellow-800 uppercase mb-1">Notas internas</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.internal_notes}</p>
                </div>
              )}
              {quote.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-red-800 uppercase mb-1">Motivo de rechazo</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{quote.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCustomerForm && (
        <NewCustomerForm
          onClose={() => setShowCustomerForm(false)}
          onSuccess={handleCustomerCreated}
          customer={{
            name: quote.prospect_name || '',
            phone: quote.prospect_phone || '',
            email: quote.prospect_email || '',
            address: quote.prospect_address || ''
          }}
          defaultSystemType={quote.system_type || undefined}
        />
      )}
    </div>
  );
}
