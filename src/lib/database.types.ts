export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string
          customer_id: string
          name: string
          serial_number: string | null
          last_service_date: string | null
          next_service_date: string | null
          installation_cost: number | null
          installed_by: string | null
          service_order_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          name: string
          serial_number?: string | null
          last_service_date?: string | null
          next_service_date?: string | null
          installation_cost?: number | null
          installed_by?: string | null
          service_order_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          name?: string
          serial_number?: string | null
          last_service_date?: string | null
          next_service_date?: string | null
          installation_cost?: number | null
          installed_by?: string | null
          service_order_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      bulk_change_log: {
        Row: {
          id: string
          action: string
          event_ids: string[]
          event_count: number
          target_date: string
          mode: string
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          event_ids: string[]
          event_count: number
          target_date: string
          mode: string
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          event_ids?: string[]
          event_count?: number
          target_date?: string
          mode?: string
          created_at?: string
        }
      }
      calendar_concepts: {
        Row: {
          id: string
          concept_type: string
          title: string
          description: string | null
          duration_minutes: number
          customer_id: string | null
          technician_id: string | null
          estimated_amount: number | null
          priority: string
          status: string
          service_order_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          concept_type: string
          title: string
          description?: string | null
          duration_minutes?: number
          customer_id?: string | null
          technician_id?: string | null
          estimated_amount?: number | null
          priority?: string
          status?: string
          service_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          concept_type?: string
          title?: string
          description?: string | null
          duration_minutes?: number
          customer_id?: string | null
          technician_id?: string | null
          estimated_amount?: number | null
          priority?: string
          status?: string
          service_order_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_account_numbers: {
        Row: {
          id: string
          customer_id: string | null
          account_number: string
          branch_name: string | null
          is_single_branch: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          account_number: string
          branch_name?: string | null
          is_single_branch?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          account_number?: string
          branch_name?: string | null
          is_single_branch?: boolean
          created_at?: string
        }
      }
      customer_contacts: {
        Row: {
          id: string
          customer_id: string
          contact_type: string
          name: string
          phone: string
          email: string | null
          relationship: string | null
          is_primary: boolean
          is_validated: boolean
          last_validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          contact_type?: string
          name: string
          phone: string
          email?: string | null
          relationship?: string | null
          is_primary?: boolean
          is_validated?: boolean
          last_validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          contact_type?: string
          name?: string
          phone?: string
          email?: string | null
          relationship?: string | null
          is_primary?: boolean
          is_validated?: boolean
          last_validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_equipment: {
        Row: {
          id: string
          customer_id: string
          equipment_type: string
          brand: string
          model: string
          quantity: number
          serial_number: string | null
          installation_date: string | null
          warranty_expires: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          equipment_type?: string
          brand: string
          model: string
          quantity?: number
          serial_number?: string | null
          installation_date?: string | null
          warranty_expires?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          equipment_type?: string
          brand?: string
          model?: string
          quantity?: number
          serial_number?: string | null
          installation_date?: string | null
          warranty_expires?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_monitoring_subscriptions: {
        Row: {
          id: string
          customer_id: string
          plan_id: string | null
          start_date: string
          renewal_date: string
          status: string
          auto_renew: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          plan_id?: string | null
          start_date?: string
          renewal_date: string
          status?: string
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          plan_id?: string | null
          start_date?: string
          renewal_date?: string
          status?: string
          auto_renew?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      customer_payment_history: {
        Row: {
          id: string
          customer_id: string
          invoice_id: string | null
          payment_date: string
          amount: number
          payment_method: string
          reference: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          invoice_id?: string | null
          payment_date?: string
          amount: number
          payment_method: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          invoice_id?: string | null
          payment_date?: string
          amount?: number
          payment_method?: string
          reference?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          owner_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          customer_type: string
          communication_tech: string
          monitoring_plan: string | null
          status: string
          business_name: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          property_type: string
          credit_classification: string
          account_type: string
          billing_preference: string
          billing_cycle: string
          neighborhood: string | null
          city: string | null
          state: string | null
          consolidation_parent_id: string | null
          account_number: number | null
          is_master_account: boolean
          service_count: number
          first_service_date: string | null
          is_suspended: boolean
          suspension_start_date: string | null
          suspension_end_date: string | null
          suspension_reason: string | null
          birth_date: string | null
          annual_fee_due_date: string | null
          last_signal_received: string | null
          cancellation_reason: string | null
          cancellation_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          customer_type?: string
          communication_tech?: string
          monitoring_plan?: string | null
          status?: string
          business_name?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          property_type?: string
          credit_classification?: string
          account_type?: string
          billing_preference?: string
          billing_cycle?: string
          consolidation_parent_id?: string | null
          account_number?: number | null
          is_master_account?: boolean
          service_count?: number
          first_service_date?: string | null
          is_suspended?: boolean
          suspension_start_date?: string | null
          suspension_end_date?: string | null
          suspension_reason?: string | null
          birth_date?: string | null
          annual_fee_due_date?: string | null
          last_signal_received?: string | null
          cancellation_reason?: string | null
          cancellation_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          customer_type?: string
          communication_tech?: string
          monitoring_plan?: string | null
          status?: string
          business_name?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          property_type?: string
          credit_classification?: string
          account_type?: string
          billing_preference?: string
          billing_cycle?: string
          consolidation_parent_id?: string | null
          account_number?: number | null
          is_master_account?: boolean
          service_count?: number
          first_service_date?: string | null
          is_suspended?: boolean
          suspension_start_date?: string | null
          suspension_end_date?: string | null
          suspension_reason?: string | null
          birth_date?: string | null
          annual_fee_due_date?: string | null
          last_signal_received?: string | null
          cancellation_reason?: string | null
          cancellation_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dunning_actions: {
        Row: {
          id: string
          customer_id: string
          invoice_id: string | null
          action_type: string
          scheduled_date: string
          completed_date: string | null
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          invoice_id?: string | null
          action_type: string
          scheduled_date: string
          completed_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          invoice_id?: string | null
          action_type?: string
          scheduled_date?: string
          completed_date?: string | null
          status?: string
          notes?: string | null
          created_at?: string
        }
      }
      emergency_contacts: {
        Row: {
          id: string
          customer_id: string
          name: string
          phone: string
          relationship: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          name: string
          phone: string
          relationship?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          name?: string
          phone?: string
          relationship?: string | null
          created_at?: string
        }
      }
      field_permissions: {
        Row: {
          id: string
          table_name: string
          field_name: string
          field_label: string
          description: string | null
          category: string
          is_sensitive: boolean
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          field_name: string
          field_label: string
          description?: string | null
          category: string
          is_sensitive?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          field_name?: string
          field_label?: string
          description?: string | null
          category?: string
          is_sensitive?: boolean
          created_at?: string
        }
      }
      folio_series: {
        Row: {
          id: string
          series_code: string
          series_name: string
          document_type: string
          location_type: string
          prefix: string
          next_number: number
          is_active: boolean
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          series_code: string
          series_name: string
          document_type?: string
          location_type?: string
          prefix: string
          next_number?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          series_code?: string
          series_name?: string
          document_type?: string
          location_type?: string
          prefix?: string
          next_number?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_alerts: {
        Row: {
          id: string
          product_id: string | null
          alert_type: string
          severity: string
          message: string
          is_resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id?: string | null
          alert_type: string
          severity?: string
          message: string
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string | null
          alert_type?: string
          severity?: string
          message?: string
          is_resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
      }
      inventory_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_category_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_category_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_category_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      inventory_products: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          category_id: string | null
          brand: string | null
          model: string | null
          unit_of_measure: string
          unit_cost: number
          selling_price: number
          min_stock_level: number
          max_stock_level: number
          reorder_point: number
          reorder_quantity: number
          primary_supplier_id: string | null
          is_serialized: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          model?: string | null
          unit_of_measure?: string
          unit_cost?: number
          selling_price?: number
          min_stock_level?: number
          max_stock_level?: number
          reorder_point?: number
          reorder_quantity?: number
          primary_supplier_id?: string | null
          is_serialized?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          description?: string | null
          category_id?: string | null
          brand?: string | null
          model?: string | null
          unit_of_measure?: string
          unit_cost?: number
          selling_price?: number
          min_stock_level?: number
          max_stock_level?: number
          reorder_point?: number
          reorder_quantity?: number
          primary_supplier_id?: string | null
          is_serialized?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inventory_purchase_order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
          total_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
          total_cost: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
          total_cost?: number
          created_at?: string
        }
      }
      inventory_purchase_orders: {
        Row: {
          id: string
          order_number: string
          supplier_id: string | null
          status: string
          order_date: string
          expected_delivery_date: string | null
          received_date: string | null
          total_amount: number
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          order_number: string
          supplier_id?: string | null
          status?: string
          order_date?: string
          expected_delivery_date?: string | null
          received_date?: string | null
          total_amount?: number
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          order_number?: string
          supplier_id?: string | null
          status?: string
          order_date?: string
          expected_delivery_date?: string | null
          received_date?: string | null
          total_amount?: number
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      inventory_stock: {
        Row: {
          id: string
          product_id: string
          quantity_available: number
          quantity_reserved: number
          quantity_on_order: number
          average_cost: number
          last_restocked_at: string | null
          last_counted_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity_available?: number
          quantity_reserved?: number
          quantity_on_order?: number
          average_cost?: number
          last_restocked_at?: string | null
          last_counted_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity_available?: number
          quantity_reserved?: number
          quantity_on_order?: number
          average_cost?: number
          last_restocked_at?: string | null
          last_counted_at?: string | null
          updated_at?: string
        }
      }
      inventory_suppliers: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          tax_id: string | null
          payment_terms: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tax_id?: string | null
          payment_terms?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          product_id: string | null
          transaction_type: string
          quantity: number
          unit_cost: number
          total_cost: number
          reference_type: string | null
          reference_id: string | null
          supplier_id: string | null
          service_order_id: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          transaction_type: string
          quantity: number
          unit_cost?: number
          total_cost?: number
          reference_type?: string | null
          reference_id?: string | null
          supplier_id?: string | null
          service_order_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          transaction_type?: string
          quantity?: number
          unit_cost?: number
          total_cost?: number
          reference_type?: string | null
          reference_id?: string | null
          supplier_id?: string | null
          service_order_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          customer_id: string
          order_id: string | null
          invoice_number: string
          amount: number
          status: string
          due_date: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_id?: string | null
          invoice_number: string
          amount: number
          status?: string
          due_date: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_id?: string | null
          invoice_number?: string
          amount?: number
          status?: string
          due_date?: string
          paid_at?: string | null
          created_at?: string
        }
      }
      monitoring_plans: {
        Row: {
          id: string
          plan_name: string
          billing_cycle: string
          price: number
          features: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          plan_name: string
          billing_cycle?: string
          price: number
          features?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          plan_name?: string
          billing_cycle?: string
          price?: number
          features?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      notification_config: {
        Row: {
          id: string
          notification_type: string
          is_enabled: boolean
          trigger_condition: Json
          template_id: string | null
          send_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          notification_type: string
          is_enabled?: boolean
          trigger_condition: Json
          template_id?: string | null
          send_time?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          notification_type?: string
          is_enabled?: boolean
          trigger_condition?: Json
          template_id?: string | null
          send_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      notification_history: {
        Row: {
          id: string
          customer_id: string | null
          notification_type: string
          recipient_email: string
          subject: string
          body: string
          status: string
          sent_at: string
          error_message: string | null
          opened_at: string | null
          clicked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          notification_type: string
          recipient_email: string
          subject: string
          body: string
          status: string
          sent_at?: string
          error_message?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          notification_type?: string
          recipient_email?: string
          subject?: string
          body?: string
          status?: string
          sent_at?: string
          error_message?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
      }
      notification_templates: {
        Row: {
          id: string
          name: string
          type: string
          subject: string
          body: string
          variables: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          subject: string
          body: string
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          subject?: string
          body?: string
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          customer_id: string | null
          title: string
          description: string | null
          estimated_value: number
          status: string
          close_date: string | null
          assigned_to: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          title: string
          description?: string | null
          estimated_value: number
          status?: string
          close_date?: string | null
          assigned_to?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          title?: string
          description?: string | null
          estimated_value?: number
          status?: string
          close_date?: string | null
          assigned_to?: string | null
          created_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          invoice_id: string | null
          customer_id: string
          amount: number
          payment_method: string
          transaction_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          customer_id: string
          amount: number
          payment_method: string
          transaction_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          customer_id?: string
          amount?: number
          payment_method?: string
          transaction_id?: string | null
          status?: string
          created_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          module: string
          action: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          module: string
          action: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          module?: string
          action?: string
          description?: string | null
          created_at?: string
        }
      }
      priority_rules: {
        Row: {
          id: string
          priority: string
          max_hours_before_reschedule: number
          auto_reschedule_enabled: boolean
          notification_enabled: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          priority: string
          max_hours_before_reschedule: number
          auto_reschedule_enabled?: boolean
          notification_enabled?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          priority?: string
          max_hours_before_reschedule?: number
          auto_reschedule_enabled?: boolean
          notification_enabled?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      recurring_schedules: {
        Row: {
          id: string
          customer_id: string
          service_type: string
          frequency: string
          next_due_date: string
          last_service_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          service_type: string
          frequency: string
          next_due_date: string
          last_service_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          service_type?: string
          frequency?: string
          next_due_date?: string
          last_service_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      role_field_permissions: {
        Row: {
          role_id: string
          field_permission_id: string
          can_view: boolean
          can_edit: boolean
          created_at: string
        }
        Insert: {
          role_id: string
          field_permission_id: string
          can_view?: boolean
          can_edit?: boolean
          created_at?: string
        }
        Update: {
          role_id?: string
          field_permission_id?: string
          can_view?: boolean
          can_edit?: boolean
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          created_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          display_name: string | null
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      service_order_materials: {
        Row: {
          id: string
          order_id: string
          item_name: string
          quantity: number
          unit_cost: number | null
          total_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          item_name: string
          quantity: number
          unit_cost?: number | null
          total_cost?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          item_name?: string
          quantity?: number
          unit_cost?: number | null
          total_cost?: number | null
          created_at?: string
        }
      }
      service_order_photos: {
        Row: {
          id: string
          service_order_id: string
          photo_url: string
          photo_description: string | null
          photo_type: string
          display_order: number
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_order_id: string
          photo_url: string
          photo_description?: string | null
          photo_type?: string
          display_order?: number
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_order_id?: string
          photo_url?: string
          photo_description?: string | null
          photo_type?: string
          display_order?: number
          uploaded_by?: string | null
          created_at?: string
        }
      }
      service_orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          technician_id: string | null
          status: string
          description: string | null
          scheduled_date: string | null
          completed_date: string | null
          monitoring_center_folio: string | null
          priority: string
          time_spent_minutes: number
          is_paid: boolean
          payment_amount: number
          payment_method: string | null
          payment_date: string | null
          closed_at: string | null
          closed_by: string | null
          email_sent: boolean
          email_sent_at: string | null
          folio_series_id: string | null
          folio_number: number | null
          full_folio: string | null
          reschedule_count: number
          last_rescheduled_at: string | null
          original_scheduled_date: string | null
          days_overdue: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          customer_id: string
          technician_id?: string | null
          status?: string
          description?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          monitoring_center_folio?: string | null
          priority?: string
          time_spent_minutes?: number
          is_paid?: boolean
          payment_amount?: number
          payment_method?: string | null
          payment_date?: string | null
          closed_at?: string | null
          closed_by?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          folio_series_id?: string | null
          folio_number?: number | null
          full_folio?: string | null
          reschedule_count?: number
          last_rescheduled_at?: string | null
          original_scheduled_date?: string | null
          days_overdue?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          technician_id?: string | null
          status?: string
          description?: string | null
          scheduled_date?: string | null
          completed_date?: string | null
          monitoring_center_folio?: string | null
          priority?: string
          time_spent_minutes?: number
          is_paid?: boolean
          payment_amount?: number
          payment_method?: string | null
          payment_date?: string | null
          closed_at?: string | null
          closed_by?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          folio_series_id?: string | null
          folio_number?: number | null
          full_folio?: string | null
          reschedule_count?: number
          last_rescheduled_at?: string | null
          original_scheduled_date?: string | null
          days_overdue?: number
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          description: string | null
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
      technician_details: {
        Row: {
          id: string
          user_profile_id: string
          specialty: string | null
          hourly_rate: number
          work_schedule_start: string | null
          work_schedule_end: string | null
          available_monday: boolean
          available_tuesday: boolean
          available_wednesday: boolean
          available_thursday: boolean
          available_friday: boolean
          available_saturday: boolean
          available_sunday: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_profile_id: string
          specialty?: string | null
          hourly_rate?: number
          work_schedule_start?: string | null
          work_schedule_end?: string | null
          available_monday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          available_thursday?: boolean
          available_friday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_profile_id?: string
          specialty?: string | null
          hourly_rate?: number
          work_schedule_start?: string | null
          work_schedule_end?: string | null
          available_monday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          available_thursday?: boolean
          available_friday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      technician_notifications: {
        Row: {
          id: string
          technician_id: string
          service_order_id: string | null
          notification_type: string
          message: string
          priority: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          technician_id: string
          service_order_id?: string | null
          notification_type: string
          message: string
          priority?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          technician_id?: string
          service_order_id?: string | null
          notification_type?: string
          message?: string
          priority?: string
          is_read?: boolean
          created_at?: string
        }
      }
      technicians: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          employee_number: string | null
          specialty: string | null
          hourly_rate: number
          hire_date: string | null
          work_schedule_start: string | null
          work_schedule_end: string | null
          available_monday: boolean
          available_tuesday: boolean
          available_wednesday: boolean
          available_thursday: boolean
          available_friday: boolean
          available_saturday: boolean
          available_sunday: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email?: string | null
          phone?: string | null
          employee_number?: string | null
          specialty?: string | null
          hourly_rate?: number
          hire_date?: string | null
          work_schedule_start?: string | null
          work_schedule_end?: string | null
          available_monday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          available_thursday?: boolean
          available_friday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          employee_number?: string | null
          specialty?: string | null
          hourly_rate?: number
          hire_date?: string | null
          work_schedule_start?: string | null
          work_schedule_end?: string | null
          available_monday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          available_thursday?: boolean
          available_friday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          calendar_view: string
          visible_fields: string[]
          active_filters: Json
          saved_views: Json
          theme_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          calendar_view?: string
          visible_fields?: string[]
          active_filters?: Json
          saved_views?: Json
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          calendar_view?: string
          visible_fields?: string[]
          active_filters?: Json
          saved_views?: Json
          theme_preference?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
          assigned_at: string
        }
        Insert: {
          user_id: string
          role_id: string
          assigned_at?: string
        }
        Update: {
          user_id?: string
          role_id?: string
          assigned_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
