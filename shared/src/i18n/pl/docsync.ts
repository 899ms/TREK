import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Synchronizacja dokumentów',
  'docsync.subtitle': 'Utrzymuj dokumenty tej podróży w zgodzie z własnym repozytorium dokumentów.',
  'docsync.noProviders': 'Brak dostępnych dostawców dokumentów',
  'docsync.noProvidersHint': 'Administrator instancji włącza ich w sekcji Administracja → Dodatki → Dokumenty.',
  'docsync.addProvider': 'Połącz dostawcę',
  'docsync.test': 'Testuj połączenie',
  'docsync.connected': 'Połączono',
  'docsync.chooseFolder': 'Wybierz folder',
  'docsync.chooseFolderHint':
    'Wskaż folder, tag lub przestrzeń należącą do tej podróży. Synchronizowane są tylko dokumenty, które się w niej znajdują.',
  'docsync.noFolders': 'Na tej instancji nic jeszcze nie znaleziono.',
  'docsync.newFolderPlaceholder': 'Nazwa nowego folderu',
  'docsync.createFolder': 'Utwórz',
  'docsync.syncNow': 'Synchronizuj teraz',
  'docsync.unlink': 'Rozłącz',
  'docsync.syncEnabled': 'Synchronizuj automatycznie',
  'docsync.direction': 'Kierunek',
  'docsync.directionBoth': 'W obie strony',
  'docsync.directionPull': 'Tylko do TREK',
  'docsync.directionPush': 'Tylko do dostawcy',
  'docsync.deletePolicy': 'Gdy dokument zostanie usunięty',
  'docsync.deleteUnlink': 'Zachowaj obie kopie, usuń powiązanie',
  'docsync.deleteTrash': 'Przenieś drugą kopię do jej kosza',
  'docsync.webhookHint':
    'Wklej ten adres URL u swojego dostawcy, aby zmiany docierały natychmiast. Bez tego TREK sprawdza je co jakiś czas.',

  // Pola formularza połączenia. Klucze odpowiadają kolumnie `label` w tabeli
  // document_provider_fields, która przechowuje sufiks klucza, a nie tekst.
  'docsync.providerUrl': 'Adres',
  'docsync.providerApiToken': 'Token API',
  'docsync.providerApiKey': 'Klucz API',
  'docsync.providerAppPassword': 'Hasło aplikacji',
  'docsync.providerAppToken': 'Token aplikacji',
  'docsync.providerUsername': 'Nazwa użytkownika',
  'docsync.providerPassword': 'Hasło',
  'docsync.providerOrganization': 'Identyfikator organizacji',
  'docsync.providerBasePath': 'Folder bazowy',
  'docsync.providerOTP': 'Kod dwuskładnikowy',
  'docsync.allowInsecureTls': 'Zezwalaj na certyfikat z własnym podpisem',

  'docsync.hintPaperlessToken': 'Utwórz go w Paperless-ngx w sekcji My Profile. Ma pełne uprawnienia tego konta.',
  'docsync.hintPapraKey':
    'Utwórz go w Papra w sekcji API keys. Klucze Papra zawsze obejmują wszystkie organizacje, do których należysz.',
  'docsync.hintPapraOrg': 'Identyfikator org_… z paska adresu Papra.',
  'docsync.hintNextcloudLogin': 'Twoja nazwa logowania w Nextcloud, nie adres e-mail.',
  'docsync.hintNextcloudAppPassword':
    'Ustawienia → Bezpieczeństwo → Utwórz nowe hasło aplikacji. Nigdy hasło do konta.',
  'docsync.hintOpenCloudToken': 'Tworzony w OpenCloud w sekcji tokenów aplikacji.',
  'docsync.hintBasePath': 'Miejsce, w którym TREK szuka folderów podróży. Domyślnie /TREK.',
  'docsync.hintSynologyUrl': 'Podaj również port, na przykład https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Najlepiej osobne konto DSM z dostępem tylko do tego folderu współdzielonego.',
  'docsync.hintSynologyOtp': 'Potrzebny tylko raz, jeśli konto używa uwierzytelniania dwuskładnikowego.',

  'docsync.linkState.never': 'Jeszcze nie synchronizowano',
  'docsync.linkState.ok': 'Aktualne',
  'docsync.linkState.partial': 'Częściowo zsynchronizowane',
  'docsync.linkState.failed': 'Niepowodzenie',
  'docsync.linkState.needs_reauth': 'Zaloguj się ponownie',
  'docsync.linkState.scope_lost': 'Folder zniknął',
  'docsync.linkState.orphaned': 'Właściciel opuścił podróż',

  'docsync.state.pending': 'Oczekuje',
  'docsync.state.synced': 'Zsynchronizowany',
  'docsync.state.conflict': 'Konflikt',
  'docsync.state.rejected_type': 'Typ niedozwolony',
  'docsync.state.too_large': 'Zbyt duży',
  'docsync.state.error': 'Błąd',
  'docsync.state.remote_missing': 'Brak u dostawcy',
  'docsync.state.local_deleted': 'Usunięty w TREK',
  'docsync.state.scope_drift': 'Przeniesiony poza folder',

  'docsync.conflict.title': 'Obie kopie zostały zmienione',
  'docsync.conflict.keepTrek': 'Zachowaj wersję z TREK',
  'docsync.conflict.keepProvider': 'Zachowaj wersję dostawcy',
  'docsync.conflict.keepBoth': 'Zachowaj obie',

  // Przyczyny błędów przesyłane są jako kody, nigdy jako tekst od dostawcy:
  // ten odpowiada po angielsku albo stroną logowania proxy w HTML, a żadna z tych
  // rzeczy nie należy do interfejsu.
  'docsync.error.unreachable': 'Nie udało się połączyć z dostawcą.',
  'docsync.error.tls_untrusted':
    'Certyfikat został odrzucony. Zezwól na certyfikaty z własnym podpisem, jeśli ufasz tej instancji.',
  'docsync.error.unauthorized': 'Dane logowania zostały odrzucone.',
  'docsync.error.forbidden': 'To konto nie ma do tego uprawnień.',
  'docsync.error.not_found': 'Nie znaleziono u dostawcy.',
  'docsync.error.scope_missing': 'Połączony folder już nie istnieje.',
  'docsync.error.rate_limited': 'Dostawca ogranicza liczbę zapytań. TREK spróbuje ponownie później.',
  'docsync.error.too_large': 'Plik jest większy, niż akceptuje dostawca.',
  'docsync.error.unsupported_type': 'Dostawca nie przyjmuje tego typu pliku.',
  'docsync.error.quota_exceeded': 'U dostawcy zabrakło miejsca.',
  'docsync.error.conflict': 'Dokument zmienił się po obu stronach.',
  'docsync.error.checksum_mismatch': 'Transfer nie dotarł w całości.',
  'docsync.error.provider_error': 'Dostawca zgłosił błąd.',
  'docsync.error.timeout': 'Dostawca odpowiadał zbyt długo.',
  'docsync.error.ssrf_blocked': 'Ten adres jest niedozwolony.',
  'docsync.error.mass_delete_guard':
    'Naraz zniknęła większość dokumentów, więc nic nie zostało zmienione. Sprawdź, czy folder jest nadal podłączony.',
  'docsync.error.unknown': 'Coś poszło nie tak.',
  'docsync.error.unknown_provider': 'Ten dostawca nie jest dostępny na tej instancji.',
};

export default docsync;
