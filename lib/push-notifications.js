import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 1. Daftarkan listener DULUAN (sebelum minta izin)
    PushNotifications.addListener('registration', async (token) => {
      console.log('Token FCM didapat:', token.value);
      const table = role === 'warga' ? 'warga' : 'pengurus';
      
      // Simpan token ke database
      const { error } = await supabase
        .from(table)
        .update({ fcm_token: token.value })
        .eq('id', userId);

      if (error) console.error('Gagal simpan token:', error);
      else console.log(`Token berhasil disimpan ke tabel ${table}`);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Gagal registrasi notifikasi:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notif masuk (foreground):', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notif diklik:', notification);
      if (notification.notification.data?.url) {
        window.location.href = notification.notification.data.url;
      }
    });

    // 2. Jeda 2 detik biar WebView & Web Vercel loading dulu
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

      // 3. Minta izin
      let perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;

      // 4. Daftarkan ke Firebase
      await PushNotifications.register();
    }, 2000); // Jeda 2 detik

  } catch (err) {
    console.error('Error setup notifikasi:', err);
  }
};
