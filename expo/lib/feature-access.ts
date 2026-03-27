/**
 * Backend (server-side) feature access validation.
 * Use for sensitive operations; frontend FeatureContext is for UX only.
 * Matches database function: user_has_feature_access(user_uuid, feature_id_param)
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export async function checkFeatureAccessBackend(
  userId: string,
  featureId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_has_feature_access', {
      user_uuid: userId,
      feature_id_param: featureId,
    });
    if (error) {
      console.warn('[feature-access] Backend check failed:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn('[feature-access] Backend check error:', e);
    return false;
  }
}

/**
 * Hook for validating feature access on the backend (e.g. before a sensitive action).
 * Frontend still uses useFeatures().isFeatureVisible for UX; use this when you need server-side check.
 */
export function useFeatureAccessBackend(featureId: string) {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    setIsChecking(true);
    try {
      return await checkFeatureAccessBackend(user.id, featureId);
    } finally {
      setIsChecking(false);
    }
  }, [user?.id, featureId]);

  return { check, isChecking };
}
