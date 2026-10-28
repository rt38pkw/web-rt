  // Ubah fungsi handleTambahWarga menjadi ini
  const handleTambahWarga = async (e, overrideNoRumah) => {
    e.preventDefault();
    const finalNoRumah = overrideNoRumah || noRumah;
    if (nik.length > 0 && nik.length < 16) { alert('NIK harus 16 digit angka!'); return; }
    if (noKk.length > 0 && noKk.length < 16) { alert('No. KK harus 16 digit angka!'); return; }

    setIsSubmitting(true);
    const { data: existing } = await supabase.from('warga').select('id').eq('no_rumah', finalNoRumah.trim()).maybeSingle();
    if (existing) {
      alert(`Nomor rumah "${finalNoRumah}" sudah terdaftar!`);
      setIsSubmitting(false);
      return;
    }
    const { error } = await supabase.from('warga').insert([{
      nama_lengkap: namaLengkap.trim(), no_rumah: finalNoRumah.trim(), nik: nik.trim() || null, no_kk: noKk.trim() || null, no_wa: noWa.trim() || null,
      kategori, password: password.trim() || '123456', status_huni: statusHuni
    }]);
    setIsSubmitting(false);
    if (error) alert(`Gagal: ${error.message}`);
    else {
      alert('✅ Data Rumah ditambahkan!');
      setNamaLengkap(''); setNoRumah(''); setNik(''); setNoKk(''); setNoWa('');
      fetchWarga();
    }
  };

  // Ubah fungsi handleUpdateWarga menjadi ini
  const handleUpdateWarga = async (e, overrideNoRumah) => {
    e.preventDefault();
    const finalNoRumah = overrideNoRumah || editNoRumah;
    setProcessingId(editId);
    const { error } = await supabase.from('warga').update({
      nama_lengkap: editNama.trim(), no_rumah: finalNoRumah.trim(), nik: editNik.trim() || null, no_kk: editNoKk.trim() || null,
      no_wa: editNoWa.trim() || null, kategori: editKategori, status_huni: editStatusHuni,
    }).eq('id', editId);
    setProcessingId(null);
    if (error) alert('Gagal: ' + error.message);
    else { setShowEditModal(false); fetchWarga(); }
  };
