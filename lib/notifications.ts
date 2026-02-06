import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type SendNotificationPayload = {
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: {
    push?: boolean;
    email?: boolean;
  };
};

const getProjectId = () => {
  return Constants.expoConfig?.extra?.eas?.projectId;
};

export const registerForPushNotificationsAsync = async (userId: string) => {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenResponse.data;

  await supabase.from('user_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS,
      device_name: Device.modelName || null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' }
  );

  return token;
};

export const clearPushTokens = async (userId: string) => {
  await supabase.from('user_push_tokens').delete().eq('user_id', userId);
};

export const sendNotification = async (payload: SendNotificationPayload) => {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: payload,
  });
  if (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
  return data;
};


