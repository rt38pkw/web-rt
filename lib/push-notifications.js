import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  // 1. Pastikan ini jalan HANYA di aplikasi HP (bukan browser)
  if (!Capacitor.isNativePlatform()) return;

  // 2. TRIK BARU: Kasih jeda 3 detik biar WebView & Web Vercel loading dulu
  // Ini mencegah aplikasi crash (terpental) karena terlalu berat di awal
  setTimeout(async () => {
    try {
      // 3. Minta izin notifikasi ke pengguna HP
      let perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        console.log('Izin notifikasi ditolak oleh pengguna');
        return;
      }

      // 4. Daftarkan HP ke Firebase
      await PushNotifications.register();

      // 5. Tangkap "alamat" (token) dari HP, lalu simpan ke database
      PushNotifications.addListener('registration', async (token) => {
        console.log('Token FCM didapat:', token.value);
        
        // Tentukan mau disimpan ke tabel warga atau pengurus
        const table = role === 'warga' ? 'warga' : 'pengurus';
        
        const { error } = await supabase
          .from(table)
          .update({ fcm_token: token.value })
          .eq('id', userId);

        if (error) console.error('Gagal simpan token ke database:', error);
        else console.log(`Token berhasil disimpan ke tabel ${table}`);
      });

      // 6. Error handling
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Gagal registrasi notifikasi:', error);
      });

      // 7. Notif masuk saat aplikasi dibuka
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notif masuk saat aplikasi dibuka:', notification);
      });

      // 8. Notif diklik
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notif diklik:', notification);
        if (notification.notification.data?.url) {
          window.location.href = notification.notification.data.url;
        }
      });

    } catch (err) {
      console.error('Error setup notifikasi:', err);
    }
  }, 3000); // 3000 milidetik = 3 detik
};
