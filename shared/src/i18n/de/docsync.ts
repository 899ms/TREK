import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Dokumentenabgleich',
  'docsync.subtitle': 'Halte die Dokumente dieser Reise und deinen eigenen Dokumentenspeicher im Gleichstand.',
  'docsync.noProviders': 'Es sind keine Dokumentenanbieter verfügbar',
  'docsync.noProvidersHint':
    'Ein Administrator dieser Instanz schaltet sie unter Administration, Addons, Dokumente frei.',
  'docsync.addProvider': 'Anbieter verbinden',
  'docsync.test': 'Verbindung testen',
  'docsync.connected': 'Verbunden',
  'docsync.chooseFolder': 'Ordner wählen',
  'docsync.chooseFolderHint':
    'Wähle den Ordner, das Tag oder den Bereich, der zu dieser Reise gehört. Abgeglichen wird nur, was darin liegt.',
  'docsync.noFolders': 'Auf dieser Instanz wurde noch nichts gefunden.',
  'docsync.newFolderPlaceholder': 'Name des neuen Ordners',
  'docsync.createFolder': 'Anlegen',
  'docsync.syncNow': 'Jetzt abgleichen',
  'docsync.unlink': 'Trennen',
  'docsync.syncEnabled': 'Automatisch abgleichen',
  'docsync.direction': 'Richtung',
  'docsync.directionBoth': 'In beide Richtungen',
  'docsync.directionPull': 'Nur nach TREK',
  'docsync.directionPush': 'Nur zum Anbieter',
  'docsync.deletePolicy': 'Wenn ein Dokument gelöscht wird',
  'docsync.deleteUnlink': 'Beide Kopien behalten, die Verknüpfung lösen',
  'docsync.deleteTrash': 'Die andere Kopie in den Papierkorb verschieben',
  'docsync.webhookHint':
    'Trage diese URL bei deinem Anbieter ein, damit Änderungen sofort ankommen. Ohne sie fragt TREK in festen Abständen nach.',

  // Felder des Verbindungsformulars. Die Keys spiegeln die Spalte `label` in
  // document_provider_fields, die ein Key-Suffix speichert und keinen Text.
  'docsync.providerUrl': 'Adresse',
  'docsync.providerApiToken': 'API-Token',
  'docsync.providerApiKey': 'API-Schlüssel',
  'docsync.providerAppPassword': 'App-Passwort',
  'docsync.providerAppToken': 'App-Token',
  'docsync.providerUsername': 'Benutzername',
  'docsync.providerPassword': 'Passwort',
  'docsync.providerOrganization': 'Organisations-ID',
  'docsync.providerBasePath': 'Basisordner',
  'docsync.providerOTP': 'Zwei-Faktor-Code',
  'docsync.allowInsecureTls': 'Selbstsigniertes Zertifikat zulassen',

  'docsync.hintPaperlessToken': 'In Paperless unter My Profile anzulegen. Er trägt die vollen Rechte dieses Kontos.',
  'docsync.hintPapraKey':
    'In Papra unter API keys anzulegen. Papra-Schlüssel erreichen immer jede Organisation, der du angehörst.',
  'docsync.hintPapraOrg': 'Die org_…-ID aus der Adresszeile von Papra.',
  'docsync.hintNextcloudLogin': 'Dein Nextcloud-Anmeldename, nicht deine E-Mail-Adresse.',
  'docsync.hintNextcloudAppPassword':
    'Einstellungen, Sicherheit, Neues App-Passwort erstellen. Niemals dein Kontopasswort.',
  'docsync.hintOpenCloudToken': 'Wird in OpenCloud unter App-Tokens angelegt.',
  'docsync.hintBasePath': 'Wo TREK nach Reiseordnern sucht. Standard ist /TREK.',
  'docsync.hintSynologyUrl': 'Mit Port angeben, zum Beispiel https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Am besten ein eigenes DSM-Konto, das nur auf diesen freigegebenen Ordner zugreift.',
  'docsync.hintSynologyOtp': 'Nur einmal nötig, wenn das Konto Zwei-Faktor-Authentifizierung nutzt.',

  'docsync.linkState.never': 'Noch nicht abgeglichen',
  'docsync.linkState.ok': 'Im Gleichstand',
  'docsync.linkState.partial': 'Teilweise abgeglichen',
  'docsync.linkState.failed': 'Fehlgeschlagen',
  'docsync.linkState.needs_reauth': 'Erneut anmelden',
  'docsync.linkState.scope_lost': 'Ordner ist weg',
  'docsync.linkState.orphaned': 'Besitzer hat die Reise verlassen',

  'docsync.state.pending': 'Wartet',
  'docsync.state.synced': 'Abgeglichen',
  'docsync.state.conflict': 'Konflikt',
  'docsync.state.rejected_type': 'Dateityp nicht erlaubt',
  'docsync.state.too_large': 'Zu groß',
  'docsync.state.error': 'Fehler',
  'docsync.state.remote_missing': 'Beim Anbieter nicht vorhanden',
  'docsync.state.local_deleted': 'In TREK gelöscht',
  'docsync.state.scope_drift': 'Aus dem Ordner verschoben',

  'docsync.conflict.title': 'Beide Kopien wurden geändert',
  'docsync.conflict.keepTrek': 'Die TREK-Version behalten',
  'docsync.conflict.keepProvider': 'Die Version des Anbieters behalten',
  'docsync.conflict.keepBoth': 'Beide behalten',

  // Fehlergründe kommen als Codes an, nie als Text des Anbieters: der antwortet
  // englisch oder mit der HTML-Loginseite eines Proxys, und beides gehört nicht hierher.
  'docsync.error.unreachable': 'Der Anbieter war nicht erreichbar.',
  'docsync.error.tls_untrusted':
    'Das Zertifikat wurde abgelehnt. Lass selbstsignierte Zertifikate zu, wenn du dieser Instanz vertraust.',
  'docsync.error.unauthorized': 'Die Zugangsdaten wurden abgelehnt.',
  'docsync.error.forbidden': 'Dieses Konto darf das nicht.',
  'docsync.error.not_found': 'Beim Anbieter nicht gefunden.',
  'docsync.error.scope_missing': 'Den verbundenen Ordner gibt es nicht mehr.',
  'docsync.error.rate_limited': 'Der Anbieter bremst uns aus. TREK versucht es später noch einmal.',
  'docsync.error.too_large': 'Die Datei ist größer, als der Anbieter annimmt.',
  'docsync.error.unsupported_type': 'Der Anbieter nimmt diesen Dateityp nicht an.',
  'docsync.error.quota_exceeded': 'Beim Anbieter ist kein Speicher mehr frei.',
  'docsync.error.conflict': 'Das Dokument wurde auf beiden Seiten geändert.',
  'docsync.error.checksum_mismatch': 'Die Übertragung ist nicht unversehrt angekommen.',
  'docsync.error.provider_error': 'Der Anbieter hat einen Fehler gemeldet.',
  'docsync.error.timeout': 'Der Anbieter hat zu lange für eine Antwort gebraucht.',
  'docsync.error.ssrf_blocked': 'Diese Adresse ist nicht erlaubt.',
  'docsync.error.mass_delete_guard':
    'Es sind auf einen Schlag fast alle Dokumente verschwunden, deshalb wurde nichts geändert. Prüfe, ob der Ordner noch eingebunden ist.',
  'docsync.error.unknown': 'Da ist etwas schiefgelaufen.',
  'docsync.error.unknown_provider': 'Dieser Anbieter steht auf dieser Instanz nicht zur Verfügung.',
};

export default docsync;
