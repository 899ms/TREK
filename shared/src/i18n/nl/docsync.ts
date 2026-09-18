import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Documentsynchronisatie',
  'docsync.subtitle': 'Houd de documenten van deze reis gelijk met je eigen documentopslag.',
  'docsync.noProviders': 'Er zijn geen documentaanbieders beschikbaar',
  'docsync.noProvidersHint': 'Een beheerder van deze instantie zet ze aan onder Beheer, Add-ons, Documenten.',
  'docsync.addProvider': 'Aanbieder koppelen',
  'docsync.test': 'Verbinding testen',
  'docsync.connected': 'Verbonden',
  'docsync.chooseFolder': 'Map kiezen',
  'docsync.chooseFolderHint':
    'Kies de map, tag of ruimte die bij deze reis hoort. Alleen documenten daarin worden gesynchroniseerd.',
  'docsync.noFolders': 'Nog niets gevonden op deze instantie.',
  'docsync.newFolderPlaceholder': 'Naam van de nieuwe map',
  'docsync.createFolder': 'Aanmaken',
  'docsync.syncNow': 'Nu synchroniseren',
  'docsync.unlink': 'Verbinding verbreken',
  'docsync.syncEnabled': 'Automatisch synchroniseren',
  'docsync.direction': 'Richting',
  'docsync.directionBoth': 'Beide richtingen',
  'docsync.directionPull': 'Alleen naar TREK',
  'docsync.directionPush': 'Alleen naar de aanbieder',
  'docsync.deletePolicy': 'Als een document wordt verwijderd',
  'docsync.deleteUnlink': 'Beide kopieën behouden, de koppeling loslaten',
  'docsync.deleteTrash': 'De andere kopie naar de prullenbak verplaatsen',
  'docsync.webhookHint':
    'Plak deze URL bij je aanbieder, dan komen wijzigingen meteen binnen. Zonder die URL kijkt TREK op vaste tijden.',

  // Velden van het verbindingsformulier. De keys volgen de kolom `label` in
  // document_provider_fields, die een key-achtervoegsel bewaart en geen tekst.
  'docsync.providerUrl': 'Adres',
  'docsync.providerApiToken': 'API-token',
  'docsync.providerApiKey': 'API-sleutel',
  'docsync.providerAppPassword': 'App-wachtwoord',
  'docsync.providerAppToken': 'App-token',
  'docsync.providerUsername': 'Gebruikersnaam',
  'docsync.providerPassword': 'Wachtwoord',
  'docsync.providerOrganization': 'Organisatie-ID',
  'docsync.providerBasePath': 'Basismap',
  'docsync.providerOTP': 'Tweestapscode',
  'docsync.allowInsecureTls': 'Zelfondertekend certificaat toestaan',

  'docsync.hintPaperlessToken':
    'Maak er een aan in Paperless onder My Profile. Hij draagt alle rechten van dat account.',
  'docsync.hintPapraKey':
    'Maak er een aan in Papra onder API keys. Papra-sleutels reiken altijd tot elke organisatie waar je bij hoort.',
  'docsync.hintPapraOrg': 'De org_…-id uit de adresbalk van Papra.',
  'docsync.hintNextcloudLogin': 'Je Nextcloud-inlognaam, niet je e-mailadres.',
  'docsync.hintNextcloudAppPassword':
    'Instellingen, Beveiliging, Nieuw app-wachtwoord aanmaken. Nooit je accountwachtwoord.',
  'docsync.hintOpenCloudToken': 'Wordt in OpenCloud aangemaakt onder app-tokens.',
  'docsync.hintBasePath': 'Waar TREK naar reismappen zoekt. Standaard /TREK.',
  'docsync.hintSynologyUrl': 'Vermeld de poort, bijvoorbeeld https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Het beste een apart DSM-account dat alleen bij deze gedeelde map kan.',
  'docsync.hintSynologyOtp': 'Maar één keer nodig, als het account tweestapsverificatie gebruikt.',

  'docsync.linkState.never': 'Nog niet gesynchroniseerd',
  'docsync.linkState.ok': 'Synchroon',
  'docsync.linkState.partial': 'Deels gesynchroniseerd',
  'docsync.linkState.failed': 'Mislukt',
  'docsync.linkState.needs_reauth': 'Opnieuw aanmelden',
  'docsync.linkState.scope_lost': 'De map is weg',
  'docsync.linkState.orphaned': 'Eigenaar heeft de reis verlaten',

  'docsync.state.pending': 'Wacht',
  'docsync.state.synced': 'Gesynchroniseerd',
  'docsync.state.conflict': 'Conflict',
  'docsync.state.rejected_type': 'Bestandstype niet toegestaan',
  'docsync.state.too_large': 'Te groot',
  'docsync.state.error': 'Fout',
  'docsync.state.remote_missing': 'Ontbreekt bij de aanbieder',
  'docsync.state.local_deleted': 'Verwijderd in TREK',
  'docsync.state.scope_drift': 'Buiten de map verplaatst',

  'docsync.conflict.title': 'Beide kopieën zijn gewijzigd',
  'docsync.conflict.keepTrek': 'De TREK-versie behouden',
  'docsync.conflict.keepProvider': 'De versie van de aanbieder behouden',
  'docsync.conflict.keepBoth': 'Allebei behouden',

  // Foutredenen komen als code binnen, nooit als tekst van de aanbieder: die
  // antwoordt in het Engels of met de HTML-inlogpagina van een proxy, en geen van beide hoort hier.
  'docsync.error.unreachable': 'De aanbieder was niet bereikbaar.',
  'docsync.error.tls_untrusted':
    'Het certificaat is geweigerd. Sta zelfondertekende certificaten toe als je deze instantie vertrouwt.',
  'docsync.error.unauthorized': 'De inloggegevens zijn geweigerd.',
  'docsync.error.forbidden': 'Dit account mag dat niet.',
  'docsync.error.not_found': 'Niet gevonden bij de aanbieder.',
  'docsync.error.scope_missing': 'De gekoppelde map bestaat niet meer.',
  'docsync.error.rate_limited': 'De aanbieder remt ons af. TREK probeert het later opnieuw.',
  'docsync.error.too_large': 'Het bestand is groter dan de aanbieder accepteert.',
  'docsync.error.unsupported_type': 'De aanbieder accepteert dit bestandstype niet.',
  'docsync.error.quota_exceeded': 'De aanbieder heeft geen ruimte meer.',
  'docsync.error.conflict': 'Het document is aan beide kanten gewijzigd.',
  'docsync.error.checksum_mismatch': 'De overdracht is niet intact aangekomen.',
  'docsync.error.provider_error': 'De aanbieder meldde een fout.',
  'docsync.error.timeout': 'De aanbieder deed er te lang over om te antwoorden.',
  'docsync.error.ssrf_blocked': 'Dat adres is niet toegestaan.',
  'docsync.error.mass_delete_guard':
    'Bijna alle documenten verdwenen in één keer, dus er is niets gewijzigd. Controleer of de map nog gekoppeld is.',
  'docsync.error.unknown': 'Er ging iets mis.',
  'docsync.error.unknown_provider': 'Deze aanbieder is niet beschikbaar op deze instantie.',
};

export default docsync;
