import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProStatus } from '@/contexts/ProStatusContext';

interface SaveProfileOptions {
  profileId: string;
  updates: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useProfileSave() {
  const [saving, setSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const { toast } = useToast();
  const { isProUser } = useProStatus();

  const saveProfile = useCallback(async (options: SaveProfileOptions) => {
    const { profileId, updates, onSuccess, onError } = options;
    
    // Prevent concurrent saves
    const now = Date.now();
    if (now - lastSaveTime < 1000) {
      console.log('Save throttled - too soon since last save');
      return;
    }

    setSaving(true);
    setLastSaveTime(now);

    try {
      // Check Pro status directly from database for accurate validation
      console.log('Checking Pro status for profile:', profileId);
      const { data: profileData, error: profileError } = await supabase
        .from('talent_profiles')
        .select('is_pro_subscriber')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error checking Pro status:', profileError);
        throw profileError;
      }

      const isActuallyProUser = profileData?.is_pro_subscriber || false;
      console.log('Database Pro status:', isActuallyProUser, 'Context Pro status:', isProUser);

      // Validate Pro features before saving using database status
      const cleanedUpdates = { ...updates };
      
      if (!isActuallyProUser) {
        console.log('Non-Pro user attempting to save Pro features, restricting...');
        
        // Restrict Pro features for non-Pro users
        if (cleanedUpdates.soundcloud_link) {
          delete cleanedUpdates.soundcloud_link;
          console.log('Removed SoundCloud link for non-Pro user');
          toast({
            title: "Pro feature required",
            description: "SoundCloud links are only available to Pro subscribers",
            variant: "destructive"
          });
        }
        
        if (cleanedUpdates.youtube_link) {
          delete cleanedUpdates.youtube_link;
          console.log('Removed YouTube link for non-Pro user');
          toast({
            title: "Pro feature required", 
            description: "YouTube links are only available to Pro subscribers",
            variant: "destructive"
          });
        }
        
        if (cleanedUpdates.gallery_images && Array.isArray(cleanedUpdates.gallery_images) && cleanedUpdates.gallery_images.length > 1) {
          cleanedUpdates.gallery_images = cleanedUpdates.gallery_images.slice(0, 1);
          console.log('Limited gallery images for non-Pro user to 1');
          toast({
            title: "Pro feature required",
            description: "Multiple gallery images are only available to Pro subscribers. Only first image saved.",
            variant: "destructive"
          });
        }
      } else {
        console.log('Pro user confirmed, allowing all features to save');
      }

      console.log('Saving profile updates:', cleanedUpdates);
      const { error } = await supabase
        .from('talent_profiles')
        .update(cleanedUpdates)
        .eq('id', profileId);

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }

      console.log('Profile saved successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Profile save error:', error);
      onError?.(error);
      
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save profile changes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [lastSaveTime, toast]);

  return {
    saving,
    saveProfile
  };
}