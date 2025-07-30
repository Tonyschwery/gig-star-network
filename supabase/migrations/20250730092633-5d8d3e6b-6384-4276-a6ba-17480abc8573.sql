-- Create gig_applications table to track talent interactions with gigs
CREATE TABLE public.gig_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  talent_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'interested',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gig_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for gig_applications
CREATE POLICY "Talents can view their own gig applications" 
ON public.gig_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.talent_profiles 
  WHERE id = gig_applications.talent_id AND user_id = auth.uid()
));

CREATE POLICY "Talents can create their own gig applications" 
ON public.gig_applications 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.talent_profiles 
  WHERE id = gig_applications.talent_id AND user_id = auth.uid()
));

CREATE POLICY "Talents can update their own gig applications" 
ON public.gig_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.talent_profiles 
  WHERE id = gig_applications.talent_id AND user_id = auth.uid()
));

CREATE POLICY "System can update gig applications" 
ON public.gig_applications 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_gig_applications_updated_at
BEFORE UPDATE ON public.gig_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_gig_applications_gig_id ON public.gig_applications(gig_id);
CREATE INDEX idx_gig_applications_talent_id ON public.gig_applications(talent_id);