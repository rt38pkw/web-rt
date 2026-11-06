import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';

export const simpanFileKeHP = async (base64Data, namaFile, mimeType) => {
  // 1. Kalau di browser biasa, pakai cara lama (download link)
  if (!Capacitor.isNativePlatform()) {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Data}`;
    link.download = namaFile;
    link.click();
    return 'Downloaded via browser';
  }

  // 2. Kalau di APK (Capacitor), simpan ke Cache lalu masukin ke Galeri
  try {
    // Simpan sementara ke cache
    const result = await Filesystem.writeFile({
      path: namaFile,
      data: base64Data,
      directory: Directory.Cache, 
      recursive: true
    });

    // Simpan ke Galeri HP
    await Media.savePhoto({
      path: result.uri,
      albumIdentifier: 'RT 38'
    });

    return 'File berhasil disimpan ke Galeri!';
  } catch (e) {
    console.error('Gagal simpan ke galeri:', e);
    throw e;
  }
};
