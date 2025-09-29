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
      // Validate Pro features before saving
      const cleanedUpdates = { ...updates };
      
      if (!isProUser) {
        // Restrict Pro features for non-Pro users
        if (cleanedUpdates.soundcloud_link) {
          delete cleanedUpdates.soundcloud_link;
          toast({
            title: "Pro feature required",
            description: "SoundCloud links are only available to Pro subscribers",
            variant: "destructive"
          });
        }
        
        if (cleanedUpdates.youtube_link) {
          delete cleanedUpdates.youtube_link;
          toast({
            title: "Pro feature required", 
            description: "YouTube links are only available to Pro subscribers",
            variant: "destructive"
          });
        }
        
        if (cleanedUpdates.gallery_images && Array.isArray(cleanedUpdates.gallery_images) && cleanedUpdates.gallery_images.length > 1) {
          cleanedUpdates.gallery_images = cleanedUpdates.gallery_images.slice(0, 1);
          toast({
            title: "Pro feature required",
            description: "Multiple gallery images are only available to Pro subscribers. Only first image saved.",
            variant: "destructive"
          });
        }
      }

      const { error } = await supabase
        .from('talent_profiles')
        .update(cleanedUpdates)
        .eq('id', profileId);

      if (error) {
        throw error;
      }

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
  }, [isProUser, lastSaveTime, toast]);

  return {
    saving,
    saveProfile
  };
}