import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { clearPushTokens, registerForPushNotificationsAsync } from '@/lib/notifications';

export default function NotificationBootstrap() {
  const { user } = useAuth();
  const { settings } = useSettings();

  useEffect(() => {
    if (!user?.id) return;

    const syncPushToken = async () => {
      if (settings.notificationsEnabled) {
        await registerForPushNotificationsAsync(user.id);
      } else {
        await clearPushTokens(user.id);
      }
    };

    syncPushToken().catch((error) => {
      console.warn('Failed to sync push token:', error);
    });
  }, [user?.id, settings.notificationsEnabled]);

  return null;
}


