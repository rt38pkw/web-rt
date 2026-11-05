import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    PushNotifications.addListener('registration', async (token) => {
      const table = role === 'warga' ? 'warga' : 'pengurus';
      
      // Jalur pintas via Edge Function (Bypass error ON CONFLICT)
      const { error } = await supabase.functions.invoke('smart-handler', {
        body: {
          action: 'simpan_token',
          table: table,
          userId: userId,
          token: token.value
        }
      });

      // Log ke console aja, biar nggak muncul alert di layar user
      if (error) {
        console.error('Gagal simpan token:', error.message);
      } else {
        console.log('Token FCM berhasil disimpan ke database!');
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Gagal registrasi notifikasi Firebase:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notif masuk saat aplikasi dibuka:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notif diklik:', notification);
      if (notification.notification.data?.url) {
        window.location.href = notification.notification.data.url;
      }
    });

    setTimeout(async () => {
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'RT38_Notif',
          name: 'Notifikasi RT 38',
          description: 'Saluran notifikasi warga dan pengurus',
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
    console.error('Error setup notifikasi:', err);
  }
};
