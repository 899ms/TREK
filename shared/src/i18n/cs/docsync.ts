import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Synchronizace dokumentů',
  'docsync.subtitle': 'Udržujte dokumenty této cesty v souladu s vlastním úložištěm dokumentů.',
  'docsync.noProviders': 'Nejsou dostupní žádní poskytovatelé dokumentů',
  'docsync.noProvidersHint': 'Správce instance je zapíná v Administrace → Doplňky → Dokumenty.',
  'docsync.addProvider': 'Připojit poskytovatele',
  'docsync.test': 'Otestovat připojení',
  'docsync.connected': 'Připojeno',
  'docsync.chooseFolder': 'Vybrat složku',
  'docsync.chooseFolderHint':
    'Zvolte složku, štítek nebo prostor, který patří k této cestě. Synchronizují se jen dokumenty v něm.',
  'docsync.noFolders': 'Na této instanci zatím nic nenalezeno.',
  'docsync.newFolderPlaceholder': 'Název nové složky',
  'docsync.createFolder': 'Vytvořit',
  'docsync.syncNow': 'Synchronizovat teď',
  'docsync.unlink': 'Odpojit',
  'docsync.syncEnabled': 'Synchronizovat automaticky',
  'docsync.direction': 'Směr',
  'docsync.directionBoth': 'Oběma směry',
  'docsync.directionPull': 'Jen do TREKu',
  'docsync.directionPush': 'Jen k poskytovateli',
  'docsync.deletePolicy': 'Když se dokument smaže',
  'docsync.deleteUnlink': 'Zachovat obě kopie, zrušit propojení',
  'docsync.deleteTrash': 'Přesunout druhou kopii do jejího koše',
  'docsync.webhookHint':
    'Vložte tuto URL k poskytovateli, aby změny přicházely okamžitě. Bez toho se TREK ptá v pravidelných intervalech.',

  // Pole formuláře připojení. Klíče odpovídají sloupci `label` v tabulce
  // document_provider_fields, která ukládá příponu klíče, ne text.
  'docsync.providerUrl': 'Adresa',
  'docsync.providerApiToken': 'API token',
  'docsync.providerApiKey': 'API klíč',
  'docsync.providerAppPassword': 'Heslo aplikace',
  'docsync.providerAppToken': 'Token aplikace',
  'docsync.providerUsername': 'Uživatelské jméno',
  'docsync.providerPassword': 'Heslo',
  'docsync.providerOrganization': 'ID organizace',
  'docsync.providerBasePath': 'Základní složka',
  'docsync.providerOTP': 'Dvoufaktorový kód',
  'docsync.allowInsecureTls': 'Přijmout vlastnoručně podepsaný certifikát',

  'docsync.hintPaperlessToken': 'Vytvořte jej v Paperless-ngx pod My Profile. Nese plná práva daného účtu.',
  'docsync.hintPapraKey':
    'Vytvořte jej v aplikaci Papra pod API keys. Klíče Papra vždy dosáhnou na všechny organizace, do kterých patříte.',
  'docsync.hintPapraOrg': 'ID ve tvaru org_… z adresního řádku aplikace Papra.',
  'docsync.hintNextcloudLogin': 'Vaše přihlašovací jméno v Nextcloudu, ne e-mailová adresa.',
  'docsync.hintNextcloudAppPassword': 'Nastavení → Zabezpečení → Vytvořit nové heslo aplikace. Nikdy heslo k účtu.',
  'docsync.hintOpenCloudToken': 'Vytváří se v OpenCloudu pod tokeny aplikací.',
  'docsync.hintBasePath': 'Kde TREK hledá složky cest. Výchozí je /TREK.',
  'docsync.hintSynologyUrl': 'Uveďte i port, například https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Nejlépe vyhrazený účet DSM s přístupem jen k této sdílené složce.',
  'docsync.hintSynologyOtp': 'Potřeba jen jednou, pokud účet používá dvoufaktorové ověření.',

  'docsync.linkState.never': 'Zatím nesynchronizováno',
  'docsync.linkState.ok': 'Aktuální',
  'docsync.linkState.partial': 'Částečně synchronizováno',
  'docsync.linkState.failed': 'Selhalo',
  'docsync.linkState.needs_reauth': 'Přihlaste se znovu',
  'docsync.linkState.scope_lost': 'Složka zmizela',
  'docsync.linkState.orphaned': 'Vlastník opustil cestu',

  'docsync.state.pending': 'Čeká',
  'docsync.state.synced': 'Synchronizováno',
  'docsync.state.conflict': 'Konflikt',
  'docsync.state.rejected_type': 'Nepovolený typ',
  'docsync.state.too_large': 'Příliš velké',
  'docsync.state.error': 'Chyba',
  'docsync.state.remote_missing': 'Chybí u poskytovatele',
  'docsync.state.local_deleted': 'Smazáno v TREKu',
  'docsync.state.scope_drift': 'Přesunuto mimo složku',

  'docsync.conflict.title': 'Změnily se obě kopie',
  'docsync.conflict.keepTrek': 'Ponechat verzi z TREKu',
  'docsync.conflict.keepProvider': 'Ponechat verzi poskytovatele',
  'docsync.conflict.keepBoth': 'Ponechat obě',

  // Důvody selhání se přenášejí jako kódy, nikdy jako text od poskytovatele:
  // ten odpovídá anglicky nebo HTML přihlašovací stránkou proxy a ani jedno sem nepatří.
  'docsync.error.unreachable': 'Poskytovatele se nepodařilo kontaktovat.',
  'docsync.error.tls_untrusted':
    'Certifikát byl odmítnut. Pokud této instanci důvěřujete, povolte vlastnoručně podepsané certifikáty.',
  'docsync.error.unauthorized': 'Přihlašovací údaje byly odmítnuty.',
  'docsync.error.forbidden': 'Tento účet k tomu nemá oprávnění.',
  'docsync.error.not_found': 'U poskytovatele nenalezeno.',
  'docsync.error.scope_missing': 'Připojená složka už neexistuje.',
  'docsync.error.rate_limited': 'Poskytovatel omezuje počet požadavků. TREK to zkusí znovu později.',
  'docsync.error.too_large': 'Soubor je větší, než poskytovatel přijímá.',
  'docsync.error.unsupported_type': 'Poskytovatel tento typ souboru nepřijímá.',
  'docsync.error.quota_exceeded': 'Poskytovateli došlo místo.',
  'docsync.error.conflict': 'Dokument se změnil na obou stranách.',
  'docsync.error.checksum_mismatch': 'Přenos nedorazil neporušený.',
  'docsync.error.provider_error': 'Poskytovatel ohlásil chybu.',
  'docsync.error.timeout': 'Poskytovatel odpovídal příliš dlouho.',
  'docsync.error.ssrf_blocked': 'Tato adresa není povolena.',
  'docsync.error.mass_delete_guard':
    'Najednou zmizela většina dokumentů, proto se nic nezměnilo. Zkontrolujte, zda je složka stále připojená.',
  'docsync.error.unknown': 'Něco se pokazilo.',
  'docsync.error.unknown_provider': 'Tento poskytovatel není na této instanci dostupný.',
};

export default docsync;
