import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  setTimeout(async () => {
    try {
      // 1. KHUSUS ANDROID: Bikin Channel "RT38_Notif" biar nggak crash
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'RT38_Notif',
          name: 'Notifikasi RT 38',
          description: 'Saluran notifikasi untuk warga dan pengurus',
          importance: 5, // 5 = High Priority (bunyi & pop-up)
          visibility: 1, // 1 = Muncul di lock screen
          sound: 'default',
          vibration: true,
        });
      }

      // 2. Minta izin
      let perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;

      // 3. Daftarkan ke Firebase
      await PushNotifications.register();

      // 4. Simpan Token ke Database
      PushNotifications.addListener('registration', async (token) => {
        const table = role === 'warga' ? 'warga' : 'pengurus';
        await supabase.from(table).update({ fcm_token: token.value }).eq('id', userId);
      });

      // 5. Error handling
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Gagal registrasi notifikasi:', error);
      });

      // 6. Notif masuk saat aplikasi dibuka (Foreground)
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notif masuk saat aplikasi dibuka:', notification);
        // Kita biarin kosong dulu biar nggak crash, cuma nge-log aja
      });

      // 7. Notif diklik
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notif diklik:', notification);
        if (notification.notification.data?.url) {
          window.location.href = notification.notification.data.url;
        }
      });

    } catch (err) {
      console.error('Error setup notifikasi:', err);
    }
  }, 3000); 
};
