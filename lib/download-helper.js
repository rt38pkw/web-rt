import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const simpanFileKeHP = async (base64Data, namaFile, mimeType) => {
  // Kalau di browser biasa, pakai cara lama (download link)
  if (!Capacitor.isNativePlatform()) {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64Data}`;
    link.download = namaFile;
    link.click();
    return 'Downloaded via browser';
  }

  // Kalau di APK (Capacitor), pakai Filesystem plugin
  try {
    const result = await Filesystem.writeFile({
      path: namaFile,
      data: base64Data,
      directory: Directory.Documents, // Atau Directory.ExternalStorage
      recursive: true
    });
    return 'File berhasil disimpan di folder Documents: ' + result.uri;
  } catch (e) {
    console.error('Gagal simpan file:', e);
    throw e;
  }
};
