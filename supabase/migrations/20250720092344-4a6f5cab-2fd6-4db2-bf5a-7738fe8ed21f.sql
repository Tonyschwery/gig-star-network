-- Create RLS policies for talent-pictures storage bucket
-- Allow users to upload their own gallery images

-- Policy for INSERT (upload)
CREATE POLICY "Users can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'talent-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for SELECT (view/download)
CREATE POLICY "Gallery images are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'talent-pictures');

-- Policy for UPDATE 
CREATE POLICY "Users can update their own gallery images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'talent-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for DELETE
CREATE POLICY "Users can delete their own gallery images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'talent-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);