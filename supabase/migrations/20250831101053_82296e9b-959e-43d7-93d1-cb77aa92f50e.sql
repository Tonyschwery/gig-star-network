-- Apply the validate_pro_features trigger to talent_profiles table
DROP TRIGGER IF EXISTS validate_pro_features_trigger ON public.talent_profiles;

CREATE TRIGGER validate_pro_features_trigger
    BEFORE INSERT OR UPDATE ON public.talent_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_pro_features();