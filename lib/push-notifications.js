import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    PushNotifications.addListener('registration', async (token) => {
      // Simpan ke tabel fcm_tokens (BUKAN ke tabel warga)
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          { user_id: userId, role: role, token: token.value },
          { onConflict: 'user_id, role' }
        );
      if (error) alert('GAGAL SIMPAN: ' + error.message);
    });

    PushNotifications.addListener('registrationError', (error) => {
      alert('GAGAL REGISTRASI FIREBASE: ' + JSON.stringify(error));
    });

    setTimeout(async () => {
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'RT38_Notif',
          name: 'Notifikasi RT 38',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      }

      let perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;
      await PushNotifications.register();
    }, 2000);

  } catch (err) {
    alert('ERROR SETUP: ' + err.message);
  }
};
