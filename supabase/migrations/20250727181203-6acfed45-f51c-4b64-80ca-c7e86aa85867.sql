-- Update bookings table to handle missing equipment fields properly
-- Set defaults for existing records and make equipment fields optional

-- Set default values for existing records
UPDATE public.bookings 
SET 
  needs_equipment = COALESCE(needs_equipment, false),
  equipment_types = COALESCE(equipment_types, '{}')
WHERE needs_equipment IS NULL OR equipment_types IS NULL;

-- Update column defaults for future records
ALTER TABLE public.bookings 
ALTER COLUMN needs_equipment SET DEFAULT false;

ALTER TABLE public.bookings 
ALTER COLUMN equipment_types SET DEFAULT '{}';

-- Ensure custom_equipment is properly nullable
ALTER TABLE public.bookings 
ALTER COLUMN custom_equipment DROP NOT NULL;