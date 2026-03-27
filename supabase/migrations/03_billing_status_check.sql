-- 1. Ensure the invoices table only accepts valid statuses
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check
CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue', 'partial'));

-- 2. Ensure the billing_documents table only accepts valid payment_statuses
ALTER TABLE billing_documents DROP CONSTRAINT IF EXISTS billing_documents_payment_status_check;

ALTER TABLE billing_documents
ADD CONSTRAINT billing_documents_payment_status_check
CHECK (payment_status IN ('pending', 'paid', 'cancelled', 'overdue', 'partial'));
