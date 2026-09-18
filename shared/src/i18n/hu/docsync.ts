import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Dokumentumok szinkronizálása',
  'docsync.subtitle': 'Tartsd szinkronban ennek az útnak a dokumentumait a saját dokumentumtárolóddal.',
  'docsync.noProviders': 'Nincs elérhető dokumentumszolgáltató',
  'docsync.noProvidersHint': 'A példány rendszergazdája kapcsolja be ezeket az Admin, Bővítmények, Dokumentumok alatt.',
  'docsync.addProvider': 'Szolgáltató csatlakoztatása',
  'docsync.test': 'Kapcsolat tesztelése',
  'docsync.connected': 'Kapcsolódva',
  'docsync.chooseFolder': 'Mappa kiválasztása',
  'docsync.chooseFolderHint':
    'Válaszd ki az ehhez az úthoz tartozó mappát, címkét vagy teret. Csak az abban lévő dokumentumok szinkronizálódnak.',
  'docsync.noFolders': 'Ezen a példányon még nem található semmi.',
  'docsync.newFolderPlaceholder': 'Az új mappa neve',
  'docsync.createFolder': 'Létrehozás',
  'docsync.syncNow': 'Szinkronizálás most',
  'docsync.unlink': 'Leválasztás',
  'docsync.syncEnabled': 'Automatikus szinkronizálás',
  'docsync.direction': 'Irány',
  'docsync.directionBoth': 'Mindkét irányban',
  'docsync.directionPull': 'Csak a TREK-be',
  'docsync.directionPush': 'Csak a szolgáltató felé',
  'docsync.deletePolicy': 'Ha egy dokumentumot törölnek',
  'docsync.deleteUnlink': 'Mindkét példány maradjon meg, csak a párosítás szűnjön meg',
  'docsync.deleteTrash': 'A másik példány kerüljön a saját kukájába',
  'docsync.webhookHint':
    'Illeszd be ezt az URL-t a szolgáltatódnál, hogy a változások azonnal megérkezzenek. Enélkül a TREK időzítve ellenőriz.',

  // A kapcsolati űrlap mezői. A kulcsok a document_provider_fields tábla `label`
  // oszlopát tükrözik, amely szöveg helyett kulcsvégződést tárol.
  'docsync.providerUrl': 'Cím',
  'docsync.providerApiToken': 'API-token',
  'docsync.providerApiKey': 'API-kulcs',
  'docsync.providerAppPassword': 'Alkalmazásjelszó',
  'docsync.providerAppToken': 'Alkalmazástoken',
  'docsync.providerUsername': 'Felhasználónév',
  'docsync.providerPassword': 'Jelszó',
  'docsync.providerOrganization': 'Szervezet azonosítója',
  'docsync.providerBasePath': 'Alapmappa',
  'docsync.providerOTP': 'Kétlépcsős kód',
  'docsync.allowInsecureTls': 'Saját aláírású tanúsítvány elfogadása',

  'docsync.hintPaperlessToken':
    'A Paperlessben a Saját profil alatt hozhatsz létre egyet. Az adott fiók teljes jogosultságát viszi magával.',
  'docsync.hintPapraKey':
    'A Paprában az API-kulcsok alatt hozhatsz létre egyet. A Papra kulcsaival mindig eléred minden szervezetedet.',
  'docsync.hintPapraOrg': 'Az org_… azonosító a Papra címsorából.',
  'docsync.hintNextcloudLogin': 'A Nextcloud bejelentkezési neved, nem az e-mail-címed.',
  'docsync.hintNextcloudAppPassword':
    'Beállítások, Biztonság, Új alkalmazásjelszó létrehozása. Soha ne a fiókod jelszava.',
  'docsync.hintOpenCloudToken': 'Az OpenCloudban az alkalmazástokenek alatt jön létre.',
  'docsync.hintBasePath': 'Itt keresi a TREK az utak mappáit. Alapértelmezés szerint /TREK.',
  'docsync.hintSynologyUrl': 'Add meg a portot is, például https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Legjobb egy külön DSM-fiók, amely csak ehhez a megosztott mappához fér hozzá.',
  'docsync.hintSynologyOtp': 'Csak egyszer kell, ha a fiók kétlépcsős azonosítást használ.',

  'docsync.linkState.never': 'Még nincs szinkronizálva',
  'docsync.linkState.ok': 'Naprakész',
  'docsync.linkState.partial': 'Részben szinkronizálva',
  'docsync.linkState.failed': 'Sikertelen',
  'docsync.linkState.needs_reauth': 'Jelentkezz be újra',
  'docsync.linkState.scope_lost': 'A mappa eltűnt',
  'docsync.linkState.orphaned': 'A tulajdonos elhagyta az utat',

  'docsync.state.pending': 'Várakozik',
  'docsync.state.synced': 'Szinkronizálva',
  'docsync.state.conflict': 'Ütközés',
  'docsync.state.rejected_type': 'Nem engedélyezett típus',
  'docsync.state.too_large': 'Túl nagy',
  'docsync.state.error': 'Hiba',
  'docsync.state.remote_missing': 'Hiányzik a szolgáltatónál',
  'docsync.state.local_deleted': 'Törölve a TREK-ben',
  'docsync.state.scope_drift': 'Kikerült a mappából',

  'docsync.conflict.title': 'Mindkét példány megváltozott',
  'docsync.conflict.keepTrek': 'A TREK-verzió megtartása',
  'docsync.conflict.keepProvider': 'A szolgáltató verziójának megtartása',
  'docsync.conflict.keepBoth': 'Mindkettő megtartása',

  // A hiba okai kódként utaznak, sosem a túloldal szövegeként: a szolgáltató
  // angolul válaszol, vagy egy proxy HTML-es bejelentkező oldalával, és egyiknek
  // sincs itt helye.
  'docsync.error.unreachable': 'A szolgáltató nem érhető el.',
  'docsync.error.tls_untrusted':
    'A tanúsítvány elutasítva. Engedélyezd a saját aláírású tanúsítványokat, ha megbízol ebben a példányban.',
  'docsync.error.unauthorized': 'A hitelesítő adatokat elutasították.',
  'docsync.error.forbidden': 'Ennek a fióknak ehhez nincs jogosultsága.',
  'docsync.error.not_found': 'Nem található a szolgáltatónál.',
  'docsync.error.scope_missing': 'A csatlakoztatott mappa már nem létezik.',
  'docsync.error.rate_limited': 'A szolgáltató korlátozza a kéréseinket. A TREK később újra próbálkozik.',
  'docsync.error.too_large': 'A fájl nagyobb, mint amennyit a szolgáltató elfogad.',
  'docsync.error.unsupported_type': 'A szolgáltató nem fogadja el ezt a fájltípust.',
  'docsync.error.quota_exceeded': 'A szolgáltatónál elfogyott a hely.',
  'docsync.error.conflict': 'A dokumentum mindkét oldalon megváltozott.',
  'docsync.error.checksum_mismatch': 'Az átvitel nem érkezett meg épségben.',
  'docsync.error.provider_error': 'A szolgáltató hibát jelzett.',
  'docsync.error.timeout': 'A szolgáltató túl sokáig válaszolt.',
  'docsync.error.ssrf_blocked': 'Ez a cím nem engedélyezett.',
  'docsync.error.mass_delete_guard':
    'Egyszerre tűnt el a dokumentumok nagy része, ezért semmi nem változott. Ellenőrizd, hogy a mappa még csatolva van-e.',
  'docsync.error.unknown': 'Valami hiba történt.',
  'docsync.error.unknown_provider': 'Ez a szolgáltató nem érhető el ezen a példányon.',
};

export default docsync;
