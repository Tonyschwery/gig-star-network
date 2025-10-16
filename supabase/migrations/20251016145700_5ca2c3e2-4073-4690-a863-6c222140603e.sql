-- Step 1: Create helper function to check if user is a Pro talent
CREATE OR REPLACE FUNCTION public.is_pro_talent(requesting_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_pro_subscriber 
     FROM public.talent_profiles 
     WHERE user_id = requesting_user_id),
    false
  );
$$;

-- Step 2: Create secure view with conditional contact masking
CREATE OR REPLACE VIEW public.bookings_secure 
WITH (security_invoker = true)
AS
SELECT 
  b.id,
  b.user_id,
  b.talent_id,
  b.event_type,
  b.event_date,
  b.event_duration,
  b.event_location,
  b.event_address,
  b.status,
  b.description,
  b.created_at,
  b.updated_at,
  b.is_public_request,
  b.is_gig_opportunity,
  b.budget,
  b.budget_currency,
  b.booker_name,
  
  -- Conditionally mask booker_email
  CASE 
    WHEN is_admin(auth.uid()) THEN b.booker_email
    WHEN auth.uid() = b.user_id THEN b.booker_email
    WHEN is_pro_talent(auth.uid()) THEN b.booker_email
    ELSE NULL
  END AS booker_email,
  
  -- Conditionally mask booker_phone
  CASE 
    WHEN is_admin(auth.uid()) THEN b.booker_phone
    WHEN auth.uid() = b.user_id THEN b.booker_phone
    WHEN is_pro_talent(auth.uid()) THEN b.booker_phone
    ELSE NULL
  END AS booker_phone
  
FROM public.bookings b;

-- Step 3: Grant SELECT to authenticated users
GRANT SELECT ON public.bookings_secure TO authenticated;