import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Belge eşitleme',
  'docsync.subtitle': 'Bu gezinin belgelerini kendi belge deponuzla aynı durumda tutun.',
  'docsync.noProviders': 'Kullanılabilir belge sağlayıcısı yok',
  'docsync.noProvidersHint': 'Bunları bir kurulum yöneticisi Yönetim → Eklentiler → Belgeler altından açar.',
  'docsync.addProvider': 'Sağlayıcı bağla',
  'docsync.test': 'Bağlantıyı test et',
  'docsync.connected': 'Bağlandı',
  'docsync.chooseFolder': 'Klasör seç',
  'docsync.chooseFolderHint':
    'Bu geziye ait klasörü, etiketi veya alanı seçin. Yalnızca onun içindeki belgeler eşitlenir.',
  'docsync.noFolders': 'Bu kurulumda henüz bir şey bulunamadı.',
  'docsync.newFolderPlaceholder': 'Yeni klasör adı',
  'docsync.createFolder': 'Oluştur',
  'docsync.syncNow': 'Şimdi eşitle',
  'docsync.unlink': 'Bağlantıyı kes',
  'docsync.syncEnabled': 'Otomatik eşitle',
  'docsync.direction': 'Yön',
  'docsync.directionBoth': 'Her iki yönde',
  'docsync.directionPull': 'Yalnızca TREK’e',
  'docsync.directionPush': 'Yalnızca sağlayıcıya',
  'docsync.deletePolicy': 'Bir belge silindiğinde',
  'docsync.deleteUnlink': 'İki kopyayı da tut, eşleştirmeyi kaldır',
  'docsync.deleteTrash': 'Diğer kopyayı kendi çöp kutusuna taşı',
  'docsync.webhookHint':
    'Değişikliklerin hemen ulaşması için bu URL’yi sağlayıcınıza yapıştırın. Bu olmadan TREK belirli aralıklarla denetler.',

  // Bağlantı formunun alanları. Anahtarlar, metin yerine bir anahtar soneki
  // tutan document_provider_fields tablosundaki `label` sütununu yansıtır.
  'docsync.providerUrl': 'Adres',
  'docsync.providerApiToken': 'API belirteci',
  'docsync.providerApiKey': 'API anahtarı',
  'docsync.providerAppPassword': 'Uygulama parolası',
  'docsync.providerAppToken': 'Uygulama belirteci',
  'docsync.providerUsername': 'Kullanıcı adı',
  'docsync.providerPassword': 'Parola',
  'docsync.providerOrganization': 'Kuruluş kimliği',
  'docsync.providerBasePath': 'Temel klasör',
  'docsync.providerOTP': 'İki adımlı doğrulama kodu',
  'docsync.allowInsecureTls': 'Kendinden imzalı sertifikayı kabul et',

  'docsync.hintPaperlessToken': 'Paperless’ta Profilim altında oluşturun. O hesabın bütün yetkilerini taşır.',
  'docsync.hintPapraKey':
    'Papra’da API anahtarları altında oluşturun. Papra anahtarları her zaman üyesi olduğunuz bütün kuruluşlara erişir.',
  'docsync.hintPapraOrg': 'Papra adres çubuğundaki org_… kimliği.',
  'docsync.hintNextcloudLogin': 'Nextcloud oturum açma adınız, e-posta adresiniz değil.',
  'docsync.hintNextcloudAppPassword':
    'Ayarlar → Güvenlik → Yeni uygulama parolası oluştur. Asla hesap parolanız değil.',
  'docsync.hintOpenCloudToken': 'OpenCloud’da uygulama belirteçleri altında oluşturulur.',
  'docsync.hintBasePath': 'TREK’in gezi klasörlerini aradığı yer. Varsayılan /TREK.',
  'docsync.hintSynologyUrl': 'Bağlantı noktasını da yazın, örneğin https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'En iyisi, yalnızca bu paylaşılan klasöre erişimi olan ayrı bir DSM hesabı.',
  'docsync.hintSynologyOtp': 'Yalnızca hesapta iki adımlı doğrulama açıksa ve bir kez gerekir.',

  'docsync.linkState.never': 'Henüz eşitlenmedi',
  'docsync.linkState.ok': 'Eşit durumda',
  'docsync.linkState.partial': 'Kısmen eşitlendi',
  'docsync.linkState.failed': 'Başarısız',
  'docsync.linkState.needs_reauth': 'Yeniden oturum açın',
  'docsync.linkState.scope_lost': 'Klasör kayboldu',
  'docsync.linkState.orphaned': 'Sahibi geziden ayrıldı',

  'docsync.state.pending': 'Bekliyor',
  'docsync.state.synced': 'Eşitlendi',
  'docsync.state.conflict': 'Çakışma',
  'docsync.state.rejected_type': 'Türe izin verilmiyor',
  'docsync.state.too_large': 'Çok büyük',
  'docsync.state.error': 'Hata',
  'docsync.state.remote_missing': 'Sağlayıcıda yok',
  'docsync.state.local_deleted': 'TREK’te silindi',
  'docsync.state.scope_drift': 'Klasörün dışına taşındı',

  'docsync.conflict.title': 'İki kopya da değişti',
  'docsync.conflict.keepTrek': 'TREK sürümünü tut',
  'docsync.conflict.keepProvider': 'Sağlayıcıdaki sürümü tut',
  'docsync.conflict.keepBoth': 'İkisini de tut',

  // Hata nedenleri her zaman kod olarak taşınır, karşı taraftan gelen metin olarak değil:
  // bir sağlayıcı İngilizce yanıt verir ya da bir vekil sunucunun HTML oturum sayfasını
  // döndürür; ikisinin de burada yeri yok.
  'docsync.error.unreachable': 'Sağlayıcıya ulaşılamadı.',
  'docsync.error.tls_untrusted':
    'Sertifika reddedildi. Bu kuruluma güveniyorsanız kendinden imzalı sertifikalara izin verin.',
  'docsync.error.unauthorized': 'Kimlik bilgileri reddedildi.',
  'docsync.error.forbidden': 'Bu hesabın bunu yapma izni yok.',
  'docsync.error.not_found': 'Sağlayıcıda bulunamadı.',
  'docsync.error.scope_missing': 'Bağlanan klasör artık yok.',
  'docsync.error.rate_limited': 'Sağlayıcı istek hızımızı sınırlıyor. TREK daha sonra yeniden deneyecek.',
  'docsync.error.too_large': 'Dosya, sağlayıcının kabul ettiğinden büyük.',
  'docsync.error.unsupported_type': 'Sağlayıcı bu dosya türünü kabul etmiyor.',
  'docsync.error.quota_exceeded': 'Sağlayıcının yeri kalmadı.',
  'docsync.error.conflict': 'Belge iki tarafta da değişti.',
  'docsync.error.checksum_mismatch': 'Aktarım eksiksiz ulaşmadı.',
  'docsync.error.provider_error': 'Sağlayıcı bir hata bildirdi.',
  'docsync.error.timeout': 'Sağlayıcı yanıt vermekte çok gecikti.',
  'docsync.error.ssrf_blocked': 'Bu adrese izin verilmiyor.',
  'docsync.error.mass_delete_guard':
    'Belgelerin çoğu bir anda kayboldu, bu yüzden hiçbir şey değiştirilmedi. Klasörün hâlâ bağlı olduğunu denetleyin.',
  'docsync.error.unknown': 'Bir şeyler ters gitti.',
  'docsync.error.unknown_provider': 'Bu sağlayıcı bu kurulumda kullanılamıyor.',
};

export default docsync;
