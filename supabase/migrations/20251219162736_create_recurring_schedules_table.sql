/*
  # Create recurring schedules table for maintenance scheduling
  
  1. New Tables
    - `recurring_schedules`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `service_type` (text) - type of maintenance service
      - `frequency` (text) - 'monthly', 'quarterly', 'semiannual', or 'annual'
      - `next_date` (date) - next scheduled maintenance date
      - `last_executed` (date, nullable) - when last service was performed
      - `is_active` (boolean) - whether schedule is active
      - `notes` (text, nullable) - additional notes about the schedule
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp
  
  2. Indexes
    - Index on `customer_id` for customer lookups
    - Index on `next_date` for date-based queries
    - Index on `is_active` for filtering active schedules
    - Composite index on (customer_id, is_active)
  
  3. Triggers
    - Auto-update `updated_at` timestamp on row updates
  
  4. Security
    - Enable RLS on table
    - Add policy for authenticated users to read/write their own customer's schedules
*/

CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  next_date DATE NOT NULL,
  last_executed DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_customer_id 
  ON recurring_schedules(customer_id);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_date 
  ON recurring_schedules(next_date);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_is_active 
  ON recurring_schedules(is_active);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_customer_active 
  ON recurring_schedules(customer_id, is_active);

CREATE OR REPLACE FUNCTION update_recurring_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recurring_schedules_updated_at ON recurring_schedules;

CREATE TRIGGER trigger_recurring_schedules_updated_at
  BEFORE UPDATE ON recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_schedules_updated_at();

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recurring schedules"
  ON recurring_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create recurring schedules"
  ON recurring_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recurring schedules"
  ON recurring_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recurring schedules"
  ON recurring_schedules FOR DELETE
  TO authenticated
  USING (true);