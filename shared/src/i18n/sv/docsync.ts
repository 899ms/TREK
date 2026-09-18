import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Dokumentsynkronisering',
  'docsync.subtitle': 'Håll resans dokument i takt med ditt eget dokumentarkiv.',
  'docsync.noProviders': 'Inga dokumentleverantörer är tillgängliga',
  'docsync.noProvidersHint': 'En administratör för instansen slår på dem under Administration, Tillägg, Dokument.',
  'docsync.addProvider': 'Anslut en leverantör',
  'docsync.test': 'Testa anslutningen',
  'docsync.connected': 'Ansluten',
  'docsync.chooseFolder': 'Välj mapp',
  'docsync.chooseFolderHint':
    'Välj den mapp, tagg eller yta som hör till den här resan. Bara dokument i den synkroniseras.',
  'docsync.noFolders': 'Ingenting hittades på den här instansen än.',
  'docsync.newFolderPlaceholder': 'Namn på ny mapp',
  'docsync.createFolder': 'Skapa',
  'docsync.syncNow': 'Synkronisera nu',
  'docsync.unlink': 'Koppla från',
  'docsync.syncEnabled': 'Synkronisera automatiskt',
  'docsync.direction': 'Riktning',
  'docsync.directionBoth': 'Åt båda hållen',
  'docsync.directionPull': 'Bara in till TREK',
  'docsync.directionPush': 'Bara ut till leverantören',
  'docsync.deletePolicy': 'När ett dokument tas bort',
  'docsync.deleteUnlink': 'Behåll båda kopiorna, släpp kopplingen',
  'docsync.deleteTrash': 'Flytta den andra kopian till papperskorgen',
  'docsync.webhookHint':
    'Klistra in den här URL:en hos din leverantör så kommer ändringar direkt. Utan den kontrollerar TREK med jämna mellanrum.',

  // Fält i anslutningsformuläret. Nycklarna speglar kolumnen `label` i
  // document_provider_fields, som lagrar ett nyckelsuffix i stället för text.
  'docsync.providerUrl': 'Adress',
  'docsync.providerApiToken': 'API-token',
  'docsync.providerApiKey': 'API-nyckel',
  'docsync.providerAppPassword': 'Applösenord',
  'docsync.providerAppToken': 'App-token',
  'docsync.providerUsername': 'Användarnamn',
  'docsync.providerPassword': 'Lösenord',
  'docsync.providerOrganization': 'Organisations-ID',
  'docsync.providerBasePath': 'Basmapp',
  'docsync.providerOTP': 'Tvåfaktorskod',
  'docsync.allowInsecureTls': 'Tillåt självsignerat certifikat',

  'docsync.hintPaperlessToken': 'Skapa en under My Profile i Paperless. Den bär kontots fulla rättigheter.',
  'docsync.hintPapraKey': 'Skapa en under API keys i Papra. Papra-nycklar når alltid alla organisationer du tillhör.',
  'docsync.hintPapraOrg': 'Det org_…-id som står i adressfältet i Papra.',
  'docsync.hintNextcloudLogin': 'Ditt inloggningsnamn i Nextcloud, inte din e-postadress.',
  'docsync.hintNextcloudAppPassword': 'Inställningar, Säkerhet, Skapa nytt applösenord. Aldrig ditt kontolösenord.',
  'docsync.hintOpenCloudToken': 'Skapas under apptokens i OpenCloud.',
  'docsync.hintBasePath': 'Där TREK letar efter resmappar. Standard är /TREK.',
  'docsync.hintSynologyUrl': 'Ta med porten, till exempel https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Helst ett eget DSM-konto med åtkomst till bara den här delade mappen.',
  'docsync.hintSynologyOtp': 'Behövs bara en gång, om kontot använder tvåfaktorsautentisering.',

  'docsync.linkState.never': 'Inte synkroniserad än',
  'docsync.linkState.ok': 'Synkroniserad',
  'docsync.linkState.partial': 'Delvis synkroniserad',
  'docsync.linkState.failed': 'Misslyckades',
  'docsync.linkState.needs_reauth': 'Logga in igen',
  'docsync.linkState.scope_lost': 'Mappen är borta',
  'docsync.linkState.orphaned': 'Ägaren lämnade resan',

  'docsync.state.pending': 'Väntar',
  'docsync.state.synced': 'Synkroniserad',
  'docsync.state.conflict': 'Konflikt',
  'docsync.state.rejected_type': 'Filtypen tillåts inte',
  'docsync.state.too_large': 'För stor',
  'docsync.state.error': 'Fel',
  'docsync.state.remote_missing': 'Saknas hos leverantören',
  'docsync.state.local_deleted': 'Borttagen i TREK',
  'docsync.state.scope_drift': 'Flyttad ut ur mappen',

  'docsync.conflict.title': 'Båda kopiorna har ändrats',
  'docsync.conflict.keepTrek': 'Behåll TREK-versionen',
  'docsync.conflict.keepProvider': 'Behåll leverantörens version',
  'docsync.conflict.keepBoth': 'Behåll båda',

  // Felorsaker kommer som koder, aldrig som text från leverantören: den svarar på
  // engelska, eller med en proxys HTML-inloggningssida, och inget av det hör hemma här.
  'docsync.error.unreachable': 'Det gick inte att nå leverantören.',
  'docsync.error.tls_untrusted':
    'Certifikatet avvisades. Tillåt självsignerade certifikat om du litar på den här instansen.',
  'docsync.error.unauthorized': 'Uppgifterna avvisades.',
  'docsync.error.forbidden': 'Det här kontot får inte göra det.',
  'docsync.error.not_found': 'Hittades inte hos leverantören.',
  'docsync.error.scope_missing': 'Den anslutna mappen finns inte längre.',
  'docsync.error.rate_limited': 'Leverantören begränsar oss. TREK försöker igen senare.',
  'docsync.error.too_large': 'Filen är större än vad leverantören tar emot.',
  'docsync.error.unsupported_type': 'Leverantören tar inte emot den här filtypen.',
  'docsync.error.quota_exceeded': 'Leverantören har slut på utrymme.',
  'docsync.error.conflict': 'Dokumentet ändrades på båda sidor.',
  'docsync.error.checksum_mismatch': 'Överföringen kom inte fram hel.',
  'docsync.error.provider_error': 'Leverantören rapporterade ett fel.',
  'docsync.error.timeout': 'Leverantören tog för lång tid på sig att svara.',
  'docsync.error.ssrf_blocked': 'Den adressen är inte tillåten.',
  'docsync.error.mass_delete_guard':
    'Nästan alla dokument försvann på en gång, så ingenting ändrades. Kontrollera att mappen fortfarande är monterad.',
  'docsync.error.unknown': 'Något gick fel.',
  'docsync.error.unknown_provider': 'Den här leverantören är inte tillgänglig på den här instansen.',
};

export default docsync;
