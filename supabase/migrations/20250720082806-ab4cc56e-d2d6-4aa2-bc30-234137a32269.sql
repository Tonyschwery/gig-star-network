-- Rename country_of_residence to nationality for better clarity
ALTER TABLE public.talent_profiles 
RENAME COLUMN country_of_residence TO nationality;