import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    PushNotifications.addListener('registration', async (token) => {
      const table = role === 'warga' ? 'warga' : 'pengurus';
      
      // ═══ JALUR PINTAS: Nembak Edge Function, bukan langsung ke tabel ═══
      const { error } = await supabase.functions.invoke('smart-handler', {
        body: {
          action: 'simpan_token',
          table: table,
          userId: userId,
          token: token.value
        }
      });

      if (error) alert('GAGAL SIMPAN: ' + error.message);
      else alert('SUKSES SIMPAN TOKEN!');
    });

    PushNotifications.addListener('registrationError', (error) => {
      alert('GAGAL FIREBASE: ' + JSON.stringify(error));
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
    alert('ERROR SETUP: ' + err.message);
  }
};
