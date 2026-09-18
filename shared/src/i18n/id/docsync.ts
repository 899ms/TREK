import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Sinkronisasi dokumen',
  'docsync.subtitle': 'Jaga dokumen perjalanan ini tetap selaras dengan penyimpanan dokumen milikmu sendiri.',
  'docsync.noProviders': 'Tidak ada penyedia dokumen yang tersedia',
  'docsync.noProvidersHint': 'Administrator instans mengaktifkannya di Admin → Addon → Dokumen.',
  'docsync.addProvider': 'Hubungkan penyedia',
  'docsync.test': 'Uji koneksi',
  'docsync.connected': 'Terhubung',
  'docsync.chooseFolder': 'Pilih folder',
  'docsync.chooseFolderHint':
    'Pilih folder, tag, atau ruang yang menjadi milik perjalanan ini. Hanya dokumen di dalamnya yang disinkronkan.',
  'docsync.noFolders': 'Belum ada yang ditemukan di instans ini.',
  'docsync.newFolderPlaceholder': 'Nama folder baru',
  'docsync.createFolder': 'Buat',
  'docsync.syncNow': 'Sinkronkan sekarang',
  'docsync.unlink': 'Putuskan',
  'docsync.syncEnabled': 'Sinkronkan otomatis',
  'docsync.direction': 'Arah',
  'docsync.directionBoth': 'Dua arah',
  'docsync.directionPull': 'Hanya ke dalam TREK',
  'docsync.directionPush': 'Hanya ke penyedia',
  'docsync.deletePolicy': 'Saat sebuah dokumen dihapus',
  'docsync.deleteUnlink': 'Simpan kedua salinan, lepaskan pasangannya',
  'docsync.deleteTrash': 'Pindahkan salinan satunya ke tempat sampahnya',
  'docsync.webhookHint':
    'Tempelkan URL ini di penyediamu agar perubahan langsung tiba. Tanpa itu, TREK memeriksa secara berkala.',

  // Bidang formulir koneksi. Kuncinya mencerminkan kolom `label` di
  // document_provider_fields, yang menyimpan sufiks kunci, bukan teks.
  'docsync.providerUrl': 'Alamat',
  'docsync.providerApiToken': 'Token API',
  'docsync.providerApiKey': 'Kunci API',
  'docsync.providerAppPassword': 'Sandi aplikasi',
  'docsync.providerAppToken': 'Token aplikasi',
  'docsync.providerUsername': 'Nama pengguna',
  'docsync.providerPassword': 'Kata sandi',
  'docsync.providerOrganization': 'ID organisasi',
  'docsync.providerBasePath': 'Folder dasar',
  'docsync.providerOTP': 'Kode dua faktor',
  'docsync.allowInsecureTls': 'Terima sertifikat yang ditandatangani sendiri',

  'docsync.hintPaperlessToken': 'Buat di Paperless pada My Profile. Token ini membawa seluruh hak akun tersebut.',
  'docsync.hintPapraKey':
    'Buat di Papra pada API keys. Kunci Papra selalu menjangkau setiap organisasi yang kamu ikuti.',
  'docsync.hintPapraOrg': 'ID org_… dari bilah alamat Papra.',
  'docsync.hintNextcloudLogin': 'Nama login Nextcloud milikmu, bukan alamat emailmu.',
  'docsync.hintNextcloudAppPassword':
    'Settings → Security → Create new app password. Jangan pernah pakai kata sandi akunmu.',
  'docsync.hintOpenCloudToken': 'Dibuat di OpenCloud pada app tokens.',
  'docsync.hintBasePath': 'Tempat TREK mencari folder perjalanan. Default-nya /TREK.',
  'docsync.hintSynologyUrl': 'Sertakan portnya, misalnya https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Sebaiknya akun DSM khusus yang hanya punya akses ke folder bersama ini.',
  'docsync.hintSynologyOtp': 'Hanya perlu sekali, jika akun memakai autentikasi dua faktor.',

  'docsync.linkState.never': 'Belum disinkronkan',
  'docsync.linkState.ok': 'Tersinkron',
  'docsync.linkState.partial': 'Sebagian tersinkron',
  'docsync.linkState.failed': 'Gagal',
  'docsync.linkState.needs_reauth': 'Masuk lagi',
  'docsync.linkState.scope_lost': 'Folder sudah tidak ada',
  'docsync.linkState.orphaned': 'Pemilik meninggalkan perjalanan',

  'docsync.state.pending': 'Menunggu',
  'docsync.state.synced': 'Tersinkron',
  'docsync.state.conflict': 'Konflik',
  'docsync.state.rejected_type': 'Tipe tidak diizinkan',
  'docsync.state.too_large': 'Terlalu besar',
  'docsync.state.error': 'Kesalahan',
  'docsync.state.remote_missing': 'Tidak ada di penyedia',
  'docsync.state.local_deleted': 'Dihapus di TREK',
  'docsync.state.scope_drift': 'Dipindahkan keluar folder',

  'docsync.conflict.title': 'Kedua salinan berubah',
  'docsync.conflict.keepTrek': 'Pertahankan versi TREK',
  'docsync.conflict.keepProvider': 'Pertahankan versi penyedia',
  'docsync.conflict.keepBoth': 'Pertahankan keduanya',

  // Alasan kegagalan dikirim sebagai kode, bukan sebagai teks dari penyedia:
  // penyedia menjawab dalam bahasa Inggris, atau dengan halaman login HTML milik
  // proxy, dan keduanya tidak pantas ada di sini.
  'docsync.error.unreachable': 'Penyedia tidak dapat dijangkau.',
  'docsync.error.tls_untrusted':
    'Sertifikat ditolak. Izinkan sertifikat yang ditandatangani sendiri jika kamu memercayai instans ini.',
  'docsync.error.unauthorized': 'Kredensial ditolak.',
  'docsync.error.forbidden': 'Akun ini tidak diizinkan melakukan itu.',
  'docsync.error.not_found': 'Tidak ditemukan di penyedia.',
  'docsync.error.scope_missing': 'Folder yang terhubung sudah tidak ada.',
  'docsync.error.rate_limited': 'Penyedia membatasi laju permintaan kami. TREK akan mencoba lagi nanti.',
  'docsync.error.too_large': 'File lebih besar daripada yang diterima penyedia.',
  'docsync.error.unsupported_type': 'Penyedia tidak menerima tipe file ini.',
  'docsync.error.quota_exceeded': 'Penyedia kehabisan ruang.',
  'docsync.error.conflict': 'Dokumen berubah di kedua sisi.',
  'docsync.error.checksum_mismatch': 'Transfer tidak tiba dengan utuh.',
  'docsync.error.provider_error': 'Penyedia melaporkan kesalahan.',
  'docsync.error.timeout': 'Penyedia terlalu lama menjawab.',
  'docsync.error.ssrf_blocked': 'Alamat itu tidak diizinkan.',
  'docsync.error.mass_delete_guard':
    'Hampir semua dokumen hilang sekaligus, jadi tidak ada yang diubah. Periksa apakah foldernya masih terpasang.',
  'docsync.error.unknown': 'Ada yang tidak beres.',
  'docsync.error.unknown_provider': 'Penyedia ini tidak tersedia di instans ini.',
};

export default docsync;
