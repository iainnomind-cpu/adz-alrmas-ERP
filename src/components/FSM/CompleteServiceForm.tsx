import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { QRScannerModal } from '../CRM/QRScannerModal';
import {
  CheckCircle2,
  DollarSign,
  FileSignature,
  Loader2,
  X,
  Calendar,
  CreditCard,
  Banknote,
  Scan,
  Shield,
  Hash,
  Package,
  FileText
} from 'lucide-react';

interface CompleteServiceFormProps {
  orderId: string;
  totalCost: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface EquipmentMaterial {
  id: string;
  inventory_item_id: string;
  quantity_used: number;
  serial_number: string | null;
  installation_notes: string | null;
  inventory_items: {
    id: string;
    name: string;
    code: string;
    category: string;
  } | null;
  willInstall: boolean;
  unit_cost?: number;
}


const EQUIPMENT_CATEGORIES = ['alarm', 'panel', 'sensor', 'keyboard', 'communicator', 'camera'];

const isEquipmentCategory = (category: string): boolean => {
  return EQUIPMENT_CATEGORIES.includes(category.toLowerCase());
};

const getEquipmentCategoryLabel = (category: string): string => {
  const labels: { [key: string]: string } = {
    alarms: 'Panel de Alarma',
    panels: 'Panel',
    sensors: 'Sensor',
    keyboards: 'Teclado',
    communicators: 'Comunicador',
    cameras: 'Cámara',
    alarm: 'Panel de Alarma',
    panel: 'Panel',
    sensor: 'Sensor',
    keyboard: 'Teclado',
    communicator: 'Comunicador',
    camera: 'Cámara'
  };
  return labels[category.toLowerCase()] || 'Equipo';
};

export function CompleteServiceForm({
  orderId,
  totalCost,
  onClose,
  onSuccess
}: CompleteServiceFormProps) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [loading, setLoading] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [partialPayment, setPartialPayment] = useState<number>(0);
  const [hasPartialPayment, setHasPartialPayment] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedCardData, setScannedCardData] = useState<any>(null);
  const [serviceType, setServiceType] = useState<string>('');
  const [equipmentMaterials, setEquipmentMaterials] = useState<EquipmentMaterial[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [currentTotalCost, setCurrentTotalCost] = useState(totalCost);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState<string>('');

  useEffect(() => {
    console.log('🚀 CompleteServiceForm mounted for order:', orderId);
    loadServiceOrderDetails();
  }, [orderId]);

  const loadServiceOrderDetails = async () => {
    try {
      const { data: serviceOrder, error: orderError } = await supabase
        .from('service_orders')
        .select('service_type, customer_id, total_cost')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) {
        console.error('Error loading service order:', orderError);
        setLoadingEquipment(false);
        return;
      }

      if (serviceOrder) {
        console.log('📋 Service order loaded:', serviceOrder);

        setServiceType(serviceOrder.service_type);
        setCustomerId(serviceOrder.customer_id);
        setCurrentTotalCost(serviceOrder.total_cost);

        // Always load equipment materials for any service type
        await loadEquipmentMaterials();
      }
    } catch (err) {
      console.error('Error in loadServiceOrderDetails:', err);
      setLoadingEquipment(false);
    }
  };

  const loadEquipmentMaterials = async () => {
    try {
      console.log('=== 🔍 DEBUG: loadEquipmentMaterials STARTED ===');
      console.log('OrderId:', orderId);

      const { data: materials, error: materialsError } = await supabase
        .from('service_order_materials')
        .select(`
          *,
          inventory_items:price_list (
            id,
            name,
            code,
            category
          )
        `)
        .eq('service_order_id', orderId);

      console.log('📦 Query result - materials:', materials);
      console.log('📦 Query result - error:', materialsError);
      console.log('📦 Materials count:', materials?.length ?? 'NULL');

      if (materialsError) {
        console.error('❌ Error loading materials:', materialsError);
        setLoadingEquipment(false);
        return;
      }

      if (materials && materials.length > 0) {
        console.log(`✅ Total materials found: ${materials.length}`);

        // Load ALL materials, not just equipment categories
        const equipmentData: EquipmentMaterial[] = materials.map((m) => ({
          id: m.id,
          inventory_item_id: m.inventory_item_id,
          quantity_used: m.quantity_used,
          serial_number: m.serial_number,
          installation_notes: m.installation_notes,
          inventory_items: m.inventory_items,
          willInstall: true, // All materials marked for installation by default
          editedSerialNumber: m.serial_number || '',
          unit_cost: m.unit_cost
        }));

        console.log('🏗️ Equipment data prepared:', equipmentData.map(e => ({
          name: e.inventory_items?.name,
          category: e.inventory_items?.category,
          willInstall: e.willInstall
        })));

        setEquipmentMaterials(equipmentData);
      } else {
        console.log('⚠️ No materials found for this order');
      }

      setLoadingEquipment(false);
    } catch (err) {
      console.error('Error in loadEquipmentMaterials:', err);
      setLoadingEquipment(false);
    }
  };

  const applyDigitalDiscount = async (customerId: string) => {
    try {
      setLoading(true);

      // 1. Get Customer Tier
      const { data: customer } = await supabase
        .from('customers')
        .select('pricing_tier')
        .eq('id', customerId)
        .single();

      const tier = (customer as any)?.pricing_tier || 1;

      // 2. Get Materials
      const { data: materials } = await supabase
        .from('service_order_materials')
        .select(`
           *,
           inventory_items:price_list (
             category,
             base_price_mxn,
             discount_tier_1,
             discount_tier_2,
             discount_tier_3,
             discount_tier_4,
             discount_tier_5
           )
         `)
        .eq('service_order_id', orderId);

      if (!materials) return;

      let totalNewMaterialsCost = 0;

      // 3. Update Materials
      for (const m of materials) {
        const item = m.inventory_items;
        if (!item) continue;

        const isEquip = isEquipmentCategory(item.category || '');
        let newUnitCost = m.unit_cost;

        if (isEquip) {
          // Re-calculate base tier price
          let discountPercent = 0;
          switch (tier) {
            case 1: discountPercent = item.discount_tier_1 || 0; break;
            case 2: discountPercent = item.discount_tier_2 || 0; break;
            case 3: discountPercent = item.discount_tier_3 || 0; break;
            case 4: discountPercent = item.discount_tier_4 || 0; break;
            case 5: discountPercent = item.discount_tier_5 || 0; break;
          }

          const tierPrice = item.base_price_mxn * (1 - (discountPercent / 100));
          // Apply 10% Digital Card Discount
          newUnitCost = parseFloat((tierPrice * 0.90).toFixed(2));

          // Update database record
          await supabase
            .from('service_order_materials')
            .update({
              unit_cost: newUnitCost,
              total_cost: newUnitCost * m.quantity_used
            })
            .eq('id', m.id);
        }

        totalNewMaterialsCost += (newUnitCost * m.quantity_used);
      }

      // 4. Update Order Total
      const { data: order } = await supabase
        .from('service_orders')
        .select('labor_cost')
        .eq('id', orderId)
        .single();

      const labor = order?.labor_cost || 0;
      const newTotal = labor + totalNewMaterialsCost;

      await supabase
        .from('service_orders')
        .update({
          materials_cost: totalNewMaterialsCost,
          total_cost: newTotal,
          discount_applied_digital_card: true
        } as any)
        .eq('id', orderId);

      setCurrentTotalCost(newTotal);
      setDiscountApplied(true);
      // Show success message or badge

    } catch (e) {
      console.error('Error applying discount:', e);
      setError('Error aplicando descuento');
    } finally {
      setLoading(false);
    }
  };

  const updateEquipmentSerialNumber = (index: number, value: string) => {
    const updated = [...equipmentMaterials];
    updated[index].editedSerialNumber = value;
    setEquipmentMaterials(updated);
  };

  const toggleEquipmentWillInstall = (index: number) => {
    const updated = [...equipmentMaterials];
    updated[index].willInstall = !updated[index].willInstall;
    setEquipmentMaterials(updated);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
      }
    }
  };

  const handleQRScanSuccess = async (cardData: any) => {
    try {
      const { data: card, error: cardError } = await supabase
        .from('customer_digital_cards')
        .select('*')
        .eq('card_number', cardData.cardNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (cardError || !card) {
        setError('Tarjeta no encontrada o inactiva');
        setShowQRScanner(false);
        return;
      }

      if (cardData.validUntil) {
        const validDate = new Date(cardData.validUntil);
        if (validDate < new Date()) {
          setError('Esta tarjeta ha expirado o está bloqueada');
          setShowQRScanner(false);
          return;
        }
      }

      const { error: usageError } = await supabase
        .from('digital_card_usage')
        .insert({
          card_id: card.id,
          used_at: new Date().toISOString(),
          location: 'Servicio completado',
          notes: `Orden de servicio #${orderId}`
        });

      if (usageError) {
        console.error('Error registrando uso:', usageError);
      }

      setScannedCardData({
        cardNumber: card.card_number,
        cardholderName: card.cardholder_name,
        cardType: card.card_type
      });

      if (!signerName.trim()) {
        setSignerName(card.cardholder_name);
      }

      // Apply Discount Logic
      if (serviceType === 'installation') {
        // setError('El descuento no aplica para instalaciones (Tarjeta registrada)');
        // Just notify but don't error out the flow
      } else if (!discountApplied) {
        await applyDigitalDiscount(customerId);
      }

      setShowQRScanner(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la tarjeta');
      setShowQRScanner(false);
    }
  };

  const handleComplete = async () => {
    if (!signerName.trim()) {
      setError('El nombre del firmante es obligatorio');
      return;
    }

    if (!signatureData) {
      setError('La firma del cliente es obligatoria');
      return;
    }

    if (paymentMethod === 'credit' && !paymentTerms.trim()) {
      setError('Los términos de crédito son obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const completedTimestamp = new Date().toISOString();

      const { data: serviceOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('*, customer_id, service_type, total_cost, order_number, technician_id')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          status: 'completed',
          completed_at: completedTimestamp,
          payment_method: paymentMethod,
          payment_terms: paymentMethod === 'credit' ? paymentTerms : null,
          partial_payment: paymentMethod === 'credit' && hasPartialPayment ? partialPayment : 0
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      await supabase.from('service_order_signatures').insert([{
        service_order_id: orderId,
        signature_data: signatureData,
        signer_name: signerName,
        signer_role: 'customer',
        signed_at: completedTimestamp
      }]);

      // Debug: Log conditions for asset creation
      console.log('🔍 Checking asset creation conditions:', {
        serviceType: serviceOrder.service_type,
        equipmentMaterialsCount: equipmentMaterials.length,
        equipmentMaterials: equipmentMaterials.map(e => ({
          name: e.inventory_items?.name,
          category: e.inventory_items?.category,
          willInstall: e.willInstall
        }))
      });

      // Register equipment as assets for ANY service type if equipment is marked for installation
      if (equipmentMaterials.length > 0) {
        console.log('✅ Equipment found, creating assets...');
        const assetsCreated = await createAssetsFromEquipment(
          serviceOrder.customer_id,
          serviceOrder.order_number,
          completedTimestamp,
          serviceOrder.technician_id,
          orderId,
          serviceOrder.total_cost || 0
        );

        console.log('📦 Assets created count:', assetsCreated);

        if (assetsCreated === 0) {
          console.log('⚠️ No assets created, but continuing...');
        }
      } else {
        console.log('ℹ️ No equipment materials found, skipping asset creation');
      }

      await createInvoice(serviceOrder, completedTimestamp);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar el servicio');
    } finally {
      setLoading(false);
    }
  };

  const createAssetsFromEquipment = async (
    customerId: string,
    orderNumber: string,
    completedAt: string,
    technicianId: string,
    serviceOrderId: string,
    totalInstallationCost: number
  ): Promise<number> => {
    let assetsCreatedCount = 0;
    const errors: string[] = [];

    try {
      const equipmentToInstall = equipmentMaterials.filter(e => e.willInstall);

      console.log('🏗️ Creating assets from equipment:', {
        totalEquipment: equipmentMaterials.length,
        toInstall: equipmentToInstall.length,
        customerId,
        orderNumber
      });

      if (equipmentToInstall.length === 0) {
        console.log('⚠️ No hay equipos marcados para instalar');
        return 0;
      }

      for (const equipment of equipmentToInstall) {
        try {
          for (let i = 0; i < equipment.quantity_used; i++) {
            let finalSerialNumber: string;
            const userSerial = equipment.editedSerialNumber?.trim();

            if (userSerial) {
              if (equipment.quantity_used === 1) {
                finalSerialNumber = userSerial;
              } else {
                finalSerialNumber = `${userSerial}-${i + 1}`;
              }
            } else {
              finalSerialNumber = `INST-${orderNumber}-${equipment.id}-${i + 1}`;
            }

            const assetData: any = {
              customer_id: customerId,
              installation_date: completedAt,
              serial_number: finalSerialNumber,
              status: 'active',
              is_eol: false,
              installation_cost: equipment.unit_cost || 0,
              installed_by: technicianId,
              service_order_id: serviceOrderId
            };

            const name = equipment.inventory_items?.name || '';
            const sku = equipment.inventory_items?.code || '';
            const category = equipment.inventory_items?.category?.toLowerCase() || '';
            const fullName = name;

            console.log(`  📋 Processing equipment ${i + 1}/${equipment.quantity_used}:`, {
              name,
              sku,
              category,
              fullName,
              serialNumber: finalSerialNumber
            });

            // SIEMPRE asignar alarm_model como campo principal (es obligatorio)
            // Luego asignar campos específicos según categoría
            if (category.includes('alarm') || category.includes('panel')) {
              assetData.alarm_model = fullName;
              console.log('    ➜ Panel/Alarma - Assigned to alarm_model');
            } else if (category.includes('keyboard') || category.includes('keypad')) {
              assetData.alarm_model = `Sistema con ${fullName}`; // Fallback para alarm_model
              assetData.keyboard_model = fullName;
              console.log('    ➜ Teclado - Assigned to keyboard_model + alarm_model fallback');
            } else if (category.includes('communicator')) {
              assetData.alarm_model = `Sistema con ${fullName}`; // Fallback para alarm_model
              assetData.communicator_model = fullName;
              console.log('    ➜ Comunicador - Assigned to communicator_model + alarm_model fallback');
            } else if (category.includes('camera')) {
              assetData.alarm_model = `Cámara: ${fullName}`;
              console.log('    ➜ Cámara - Assigned to alarm_model');
            } else if (category.includes('sensor')) {
              assetData.alarm_model = `Sensor: ${fullName}`;
              console.log('    ➜ Sensor - Assigned to alarm_model');
            } else {
              // Categoría no reconocida - usar nombre como alarm_model
              assetData.alarm_model = fullName;
              console.log('    ⚠️ Categoría no reconocida - usando nombre como alarm_model');
            }

            console.log('    💾 Inserting asset:', assetData);

            const { data: insertedAsset, error: assetError } = await supabase
              .from('assets')
              .insert([assetData])
              .select();

            if (assetError) {
              errors.push(`Error creando asset para ${name}: ${assetError.message}`);
              console.error('    ❌ Error al insertar asset:', assetError);
            } else {
              assetsCreatedCount++;
              console.log('    ✅ Asset creado exitosamente:', insertedAsset);
            }
          }

          // Obtener la categoría del equipo actual
          const equipmentCategory = equipment.inventory_items?.category?.toLowerCase() || '';

          const equipmentType = equipmentCategory.includes('sensor') ? 'sensor' :
            equipmentCategory.includes('camera') ? 'camera' :
              equipmentCategory.includes('keyboard') ? 'keyboard' :
                equipmentCategory.includes('alarm') || equipmentCategory.includes('panel') ? 'alarm' : 'other';

          let equipmentNotes = `Instalado en servicio ${orderNumber}`;
          if (equipment.installation_notes?.trim()) {
            equipmentNotes += ` - ${equipment.installation_notes.trim()}`;
          }
          if (equipment.editedSerialNumber?.trim()) {
            equipmentNotes += ` - S/N: ${equipment.editedSerialNumber.trim()}`;
          }

          const equipmentData = {
            customer_id: customerId,
            equipment_type: equipmentType,
            brand: '',
            model: equipment.inventory_items?.name || '',
            quantity: equipment.quantity_used,
            serial_number: equipment.editedSerialNumber?.trim() || null,
            installation_date: completedAt,
            notes: equipmentNotes,
            installation_cost: equipment.unit_cost || 0,
            installed_by: technicianId,
            service_order_id: serviceOrderId
          };

          console.log('  💾 Creating customer_equipment record:', equipmentData);

          const { data: insertedEquipment, error: equipmentError } = await supabase
            .from('customer_equipment')
            .insert([equipmentData])
            .select();

          if (equipmentError) {
            errors.push(`Error creando customer_equipment para ${name}: ${equipmentError.message}`);
            console.error('  ❌ Error al insertar customer_equipment:', equipmentError);
          } else {
            console.log('  ✅ Customer Equipment creado exitosamente:', insertedEquipment);
          }
        } catch (itemError) {
          const name = equipment.inventory_items?.name || 'Equipo desconocido';
          errors.push(`Error procesando ${name}: ${itemError instanceof Error ? itemError.message : 'Error desconocido'}`);
          console.error('Error procesando equipo:', itemError);
        }
      }

      console.log('📊 Summary of asset creation:', {
        assetsCreated: assetsCreatedCount,
        errorsCount: errors.length,
        errors: errors
      });

      if (errors.length > 0) {
        console.error('⚠️ Errores durante la creación de activos:', errors);
      }

      if (assetsCreatedCount > 0) {
        console.log(`✅ Successfully created ${assetsCreatedCount} asset(s)`);
      }

      return assetsCreatedCount;
    } catch (error) {
      console.error('❌ Error en createAssetsFromEquipment:', error);
      return assetsCreatedCount;
    }
  };

  const createInvoice = async (serviceOrder: any, completedAt: string) => {
    try {
      const invoiceNumber = `INV-${serviceOrder.order_number}`;
      const taxAmount = serviceOrder.total_cost * 0.16;
      const totalAmount = serviceOrder.total_cost * 1.16;

      let invoiceStatus = 'pending';
      let paidDate = null;
      let dueDate = new Date(completedAt);

      if (paymentMethod === 'cash') {
        invoiceStatus = 'paid';
        paidDate = completedAt;
        dueDate = new Date(completedAt);
      } else {
        if (paymentTerms.includes('15')) {
          dueDate.setDate(dueDate.getDate() + 15);
        } else if (paymentTerms.includes('45')) {
          dueDate.setDate(dueDate.getDate() + 45);
        } else if (paymentTerms.includes('60')) {
          dueDate.setDate(dueDate.getDate() + 60);
        } else {
          dueDate.setDate(dueDate.getDate() + 30);
        }
      }


      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .maybeSingle();

      let invoice = existingInvoice;

      if (!invoice) {
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert([{
            customer_id: serviceOrder.customer_id,
            service_order_id: serviceOrder.id,
            invoice_number: invoiceNumber,
            invoice_type: serviceOrder.service_type,
            payment_type: paymentMethod,
            amount: serviceOrder.total_cost,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            due_date: dueDate.toISOString(),
            paid_date: paidDate,
            status: invoiceStatus,
            days_overdue: 0
          }])
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoice = newInvoice;
      }

      const billingDocumentType = paymentMethod === 'cash'
        ? 'ticket_contado'
        : (serviceOrder.service_type === 'installation' ? 'factura_credito_local' : 'ticket_remision');

      const billingPaymentStatus = paymentMethod === 'cash' ? 'paid' : 'pending';

      const { error: billingError } = await supabase
        .from('billing_documents')
        .insert([{
          folio: invoiceNumber,
          customer_id: serviceOrder.customer_id,
          service_order_id: serviceOrder.id,
          document_type: billingDocumentType,
          issue_date: completedAt,
          due_date: paymentMethod === 'cash' ? completedAt : dueDate.toISOString(),
          subtotal: serviceOrder.total_cost,
          tax: taxAmount,
          discount: 0,
          total: totalAmount,
          paid_amount: paymentMethod === 'cash' ? totalAmount : partialPayment,
          balance: paymentMethod === 'cash' ? 0 : (totalAmount - partialPayment),
          payment_status: paymentMethod === 'cash' ? 'paid' : (partialPayment > 0 ? 'partial' : 'pending'),
          concept: `Servicio ${serviceOrder.service_type} - Orden ${serviceOrder.order_number}`,
          description: serviceOrder.description,
          credit_days: paymentMethod === 'cash' ? 0 : Math.round((new Date(dueDate).getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24)),
          is_annual: false
        }]);

      if (billingError) {
        console.error('Error creating billing document:', billingError);
      }

      // Handle full cash payment
      if (invoiceStatus === 'paid' && invoice) {
        await supabase.from('payment_transactions').insert([{
          invoice_id: invoice.id,
          customer_id: serviceOrder.customer_id,
          amount: totalAmount,
          payment_method: 'cash',
          transaction_date: completedAt,
          notes: `Pago al contado por servicio ${serviceOrder.order_number}`
        }]);

        await supabase.from('customer_payment_history').insert([{
          customer_id: serviceOrder.customer_id,
          invoice_id: invoice.id,
          payment_date: completedAt,
          amount: totalAmount,
          payment_method: 'cash',
          reference: invoiceNumber,
          notes: 'Pago al contado por servicio completado'
        }]);

        const { data: billingDoc } = await supabase
          .from('billing_documents')
          .select('id')
          .eq('folio', invoiceNumber)
          .maybeSingle();

        if (billingDoc) {
          await supabase.from('billing_payments').insert([{
            billing_document_id: billingDoc.id,
            amount: totalAmount,
            payment_method: 'efectivo',
            payment_date: completedAt,
            notes: 'Pago al contado por servicio completado'
          }]);
        }
      }

      // Handle partial payment (anticipo) for credit
      if (paymentMethod === 'credit' && partialPayment > 0 && invoice) {
        await supabase.from('payment_transactions').insert([{
          invoice_id: invoice.id,
          customer_id: serviceOrder.customer_id,
          amount: partialPayment,
          payment_method: 'cash',
          transaction_date: completedAt,
          notes: `Anticipo por servicio ${serviceOrder.order_number}`
        }]);

        await supabase.from('customer_payment_history').insert([{
          customer_id: serviceOrder.customer_id,
          invoice_id: invoice.id,
          payment_date: completedAt,
          amount: partialPayment,
          payment_method: 'cash',
          reference: invoiceNumber,
          notes: `Anticipo - Saldo pendiente: $${(totalAmount - partialPayment).toFixed(2)}`
        }]);

        const { data: billingDoc } = await supabase
          .from('billing_documents')
          .select('id')
          .eq('folio', invoiceNumber)
          .maybeSingle();

        if (billingDoc) {
          await supabase.from('billing_payments').insert([{
            billing_document_id: billingDoc.id,
            amount: partialPayment,
            payment_method: 'efectivo',
            payment_date: completedAt,
            notes: `Anticipo - Saldo restante: $${(totalAmount - partialPayment).toFixed(2)}`
          }]);
        }

        // Update invoice to partial status
        await supabase
          .from('invoices')
          .update({
            status: 'partial',
            notes: `Anticipo de $${partialPayment.toFixed(2)} recibido. Saldo: $${(totalAmount - partialPayment).toFixed(2)}`
          })
          .eq('id', invoice.id);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Completar Servicio</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Resumen de Costos del Servicio
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">${currentTotalCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600">IVA (16%):</span>
                  <span className="font-semibold text-gray-900">${(currentTotalCost * 0.16).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t-2 border-blue-300">
                  <span className="text-lg font-bold text-gray-900">Total a Pagar:</span>
                  <span className="text-2xl font-bold text-blue-600">${(currentTotalCost * 1.16).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Método de Pago <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 border-2 rounded-xl transition-all ${paymentMethod === 'cash'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <Banknote className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  <span className={`font-medium ${paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                    Contado
                  </span>
                </button>

                <button
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-4 border-2 rounded-xl transition-all ${paymentMethod === 'credit'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <CreditCard className={`w-8 h-8 mx-auto mb-2 ${paymentMethod === 'credit' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  <span className={`font-medium ${paymentMethod === 'credit' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                    Crédito
                  </span>
                </button>
              </div>
            </div>

            {/* Partial Payment Section (only for credit) */}
            {paymentMethod === 'credit' && (
              <div className="space-y-4 border-2 border-amber-300 rounded-lg p-6 bg-amber-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    Anticipo / Enganche (Opcional)
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPartialPayment}
                      onChange={(e) => {
                        setHasPartialPayment(e.target.checked);
                        if (!e.target.checked) setPartialPayment(0);
                      }}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">El cliente dará anticipo</span>
                  </label>
                </div>

                {hasPartialPayment && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto del Anticipo
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={partialPayment || ''}
                          onChange={(e) => setPartialPayment(Number(e.target.value))}
                          max={currentTotalCost * 1.16}
                          min={0}
                          step="0.01"
                          className="w-full pl-8 pr-4 py-3 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Total con IVA: ${(currentTotalCost * 1.16).toFixed(2)} |
                        Saldo pendiente: ${((currentTotalCost * 1.16) - partialPayment).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Anticipo:</span>
                          <span className="ml-2 font-bold text-green-600">${partialPayment.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Deuda restante:</span>
                          <span className="ml-2 font-bold text-red-600">${((currentTotalCost * 1.16) - partialPayment).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condiciones de Pago
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Pago a 30 días, 15 días, etc."
                  />
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Scan className="w-5 h-5 text-blue-600" />
                    Tarjeta Digital del Cliente
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Escanea la tarjeta digital para validar el servicio
                  </p>
                </div>
              </div>

              {scannedCardData ? (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700">Tarjeta Escaneada</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Tarjeta:</span>
                      <span className="ml-2 font-medium">{scannedCardData.cardNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Titular:</span>
                      <span className="ml-2 font-medium">{scannedCardData.cardholderName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo:</span>
                      <span className="ml-2 font-medium">
                        {scannedCardData.cardType === 'titular' ? 'Titular' : 'Familiar'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Escanear otra tarjeta
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Scan className="w-5 h-5" />
                  Escanear Tarjeta Digital
                </button>
              )}
            </div>

            {paymentMethod === 'credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Términos de Crédito <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ej: 30 días, Pago semanal, etc."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Cliente <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Nombre completo del cliente"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {serviceType === 'installation' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-600 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Equipos a Registrar como Activos
                  </h3>
                  <span className="ml-auto px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full">
                    INSTALACIÓN
                  </span>
                </div>

                {loadingEquipment ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                  </div>
                ) : equipmentMaterials.length === 0 ? (
                  <div className="bg-white border border-amber-200 rounded-lg p-4 text-center">
                    <Package className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      No se encontraron equipos para esta instalación
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {equipmentMaterials.map((equipment, index) => (
                      <div
                        key={equipment.id}
                        className={`bg-white border-2 rounded-lg p-4 transition-all ${equipment.willInstall
                          ? 'border-amber-300 shadow-sm'
                          : 'border-gray-200 opacity-60'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center pt-1">
                            <input
                              type="checkbox"
                              checked={equipment.willInstall}
                              onChange={() => toggleEquipmentWillInstall(index)}
                              className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-amber-700" />
                              <h4 className="font-semibold text-gray-900">
                                {equipment.inventory_items?.name}
                              </h4>
                              <span className="text-xs font-medium text-gray-500">
                                SKU: {equipment.inventory_items?.sku}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                                {getEquipmentCategoryLabel(equipment.inventory_items?.category || '')}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                x{equipment.quantity_used}
                              </span>
                            </div>

                            {equipment.willInstall && (
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Hash className="w-3 h-3 text-gray-500" />
                                    Número de Serie {equipment.quantity_used > 1 && '(base)'}
                                  </label>
                                  <input
                                    type="text"
                                    value={equipment.editedSerialNumber}
                                    onChange={(e) => updateEquipmentSerialNumber(index, e.target.value)}
                                    placeholder={`Ej: SN${Math.floor(Math.random() * 1000000)}`}
                                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                  />
                                  {equipment.quantity_used > 1 && (
                                    <p className="text-xs text-amber-700 mt-1">
                                      Se generarán {equipment.quantity_used} activos: {equipment.editedSerialNumber || 'AUTO'}-1, {equipment.editedSerialNumber || 'AUTO'}-2, etc.
                                    </p>
                                  )}
                                </div>

                                {equipment.installation_notes && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                    <div className="flex items-start gap-1">
                                      <FileText className="w-3 h-3 text-amber-700 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-amber-900">
                                        <span className="font-medium">Notas:</span> {equipment.installation_notes}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="bg-white border-2 border-amber-300 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          Activos que se crearán:
                        </span>
                        <span className="text-2xl font-bold text-amber-700">
                          {equipmentMaterials.reduce((sum, e) => sum + (e.willInstall ? e.quantity_used : 0), 0)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Los equipos seleccionados se registrarán automáticamente en Assets y Customer Equipment
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Firma del Cliente <span className="text-red-600">*</span>
                </label>
                <button
                  onClick={clearSignature}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpiar
                </button>
              </div>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="w-full touch-none bg-gray-50 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Firme en el recuadro usando el mouse o su dedo en dispositivos táctiles
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Al completar el servicio:
              </p>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                <li>Se generará automáticamente un reporte con todos los detalles</li>
                <li>Se creará una factura {paymentMethod === 'cash' ? 'como PAGADA' : 'PENDIENTE de pago'}</li>
                {paymentMethod === 'credit' && (
                  <li>La factura vencerá en {paymentTerms || '30 días'}</li>
                )}
                {paymentMethod === 'cash' && (
                  <li>Se registrará el pago en el historial del cliente</li>
                )}
                {serviceType === 'installation' && equipmentMaterials.filter(e => e.willInstall).length > 0 && (
                  <li className="font-semibold">
                    Se crearán {equipmentMaterials.reduce((sum, e) => sum + (e.willInstall ? e.quantity_used : 0), 0)} activos en el sistema
                  </li>
                )}
              </ul>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Completar Servicio
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  );
}
