import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    PushNotifications.addListener('registration', async (token) => {
      // ═══ OPERASI ALERT: Nampilin token di layar HP ═══
      alert('Token FCM Dapet: ' + token.value);
      
      const table = role === 'warga' ? 'warga' : 'pengurus';
      const { error } = await supabase
        .from(table)
        .update({ fcm_token: token.value })
        .eq('id', userId);

      if (error) {
        // ═══ OPERASI ALERT: Nampilin error simpan database ═══
        alert('GAGAL SIMPAN KE DATABASE: ' + error.message);
        console.error('Gagal simpan token:', error);
      } else {
        alert('SUKSES SIMPAN KE DATABASE!');
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      alert('GAGAL REGISTRASI FIREBASE: ' + JSON.stringify(error));
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
      if (perm.receive !== 'granted') {
        alert('IZIN NOTIFIKASI DITOLAK!');
        return;
      }

      await PushNotifications.register();
    }, 2000);

  } catch (err) {
    alert('ERROR SETUP: ' + err.message);
  }
};
