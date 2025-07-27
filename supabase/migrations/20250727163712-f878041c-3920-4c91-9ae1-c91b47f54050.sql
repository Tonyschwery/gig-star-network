-- Fix the equipment_types column default value to prevent JSON parsing errors
-- Change from empty text array literal to NULL, which is more compatible with JSON handling
ALTER TABLE public.bookings 
ALTER COLUMN equipment_types SET DEFAULT NULL;

-- Update existing empty arrays to NULL for consistency
UPDATE public.bookings 
SET equipment_types = NULL 
WHERE equipment_types = '{}' OR equipment_types IS NULL;