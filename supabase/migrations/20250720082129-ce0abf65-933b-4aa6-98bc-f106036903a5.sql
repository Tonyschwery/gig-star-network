-- Create storage policies for talent-pictures bucket
CREATE POLICY "Users can upload their own talent pictures" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own talent pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own talent pictures" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own talent pictures" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'talent-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to view talent pictures (for public profiles)
CREATE POLICY "Public access to talent pictures" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'talent-pictures');