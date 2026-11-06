import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const simpanFileKeHP = async (base64Data, namaFile, mimeType) => {
  // 1. Kalau di browser biasa, pakai cara lama (download link)
  if (!Capacitor.isNativePlatform()) {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Data}`;
    link.download = namaFile;
    link.click();
    return 'Downloaded via browser';
  }

  // 2. Kalau di APK (Capacitor), simpan ke Cache lalu Share
  try {
    // Simpan ke folder Cache aplikasi (pasti diizinin)
    const result = await Filesystem.writeFile({
      path: namaFile,
      data: base64Data,
      directory: Directory.Cache, 
      recursive: true
    });

    // Buka menu Share Android
    await Share.share({
      title: 'Simpan / Bagikan File',
      text: 'Silakan simpan atau bagikan file ini.',
      url: result.uri,
      dialogTitle: 'Simpan atau Bagikan'
    });

    return 'Menu Share dibuka';
  } catch (e) {
    console.error('Gagal share file:', e);
    throw e;
  }
};
