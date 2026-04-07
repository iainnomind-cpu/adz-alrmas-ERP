-- Add location_id to price_list (which is the main products table now)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='price_list' AND column_name='location_id'
  ) THEN
    ALTER TABLE public.price_list 
      ADD COLUMN location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL;
      
    COMMENT ON COLUMN public.price_list.location_id IS 'Ubicación primaria / almacén del producto';
  END IF;
END $$;
