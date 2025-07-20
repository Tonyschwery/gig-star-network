-- Create enum types for talents
CREATE TYPE public.talent_act AS ENUM ('dj', 'band', 'saxophonist', 'percussionist', 'singer', 'keyboardist', 'drummer');
CREATE TYPE public.talent_gender AS ENUM ('male', 'female');

-- Create storage bucket for talent pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('talent-pictures', 'talent-pictures', true);

-- Create talent profiles table
CREATE TABLE public.talent_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  act talent_act NOT NULL,
  gender talent_gender NOT NULL,
  music_genres TEXT[] NOT NULL DEFAULT '{}',
  custom_genre TEXT,
  picture_url TEXT,
  soundcloud_link TEXT,
  youtube_link TEXT,
  biography TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 16 AND age <= 100),
  country_of_residence TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Talent profiles are viewable by everyone" 
ON public.talent_profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own talent profile" 
ON public.talent_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own talent profile" 
ON public.talent_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own talent profile" 
ON public.talent_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create storage policies for talent pictures
CREATE POLICY "Anyone can view talent pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'talent-pictures');

CREATE POLICY "Users can upload their own talent pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own talent pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own talent pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_talent_profiles_updated_at
BEFORE UPDATE ON public.talent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();