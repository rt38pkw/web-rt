import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export const setupPushNotifications = async (role, userId) => {
  // 1. Pastikan ini jalan HANYA di aplikasi HP (bukan browser)
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 2. Minta izin notifikasi ke pengguna HP
    let perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('Izin notifikasi ditolak oleh pengguna');
      return;
    }

    // 3. Daftarkan HP ke Firebase
    await PushNotifications.register();

    // 4. Tangkap "alamat" (token) dari HP, lalu simpan ke database
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

    // 5. Error handling
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Gagal registrasi notifikasi:', error);
    });

    // 6. Apa yang terjadi kalau notif masuk pas aplikasi lagi dibuka
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notif masuk saat aplikasi dibuka:', notification);
    });

    // 7. Apa yang terjadi kalau notif diklik
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notif diklik:', notification);
      // Kalau mau, bisa arahkan ke halaman tertentu di sini
    });

  } catch (err) {
    console.error('Error setup notifikasi:', err);
  }
};
