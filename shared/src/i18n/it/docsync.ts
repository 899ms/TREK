import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Sincronizzazione documenti',
  'docsync.subtitle': 'Tieni i documenti di questo viaggio allineati con il tuo archivio documenti.',
  'docsync.noProviders': 'Nessun provider di documenti disponibile',
  'docsync.noProvidersHint': 'Un amministratore dell’istanza li attiva in Admin, Moduli, Documenti.',
  'docsync.addProvider': 'Collega un provider',
  'docsync.test': 'Prova la connessione',
  'docsync.connected': 'Connesso',
  'docsync.chooseFolder': 'Scegli la cartella',
  'docsync.chooseFolderHint':
    'Scegli la cartella, il tag o lo spazio che appartiene a questo viaggio. Vengono sincronizzati solo i documenti al suo interno.',
  'docsync.noFolders': 'Non è ancora stato trovato nulla su questa istanza.',
  'docsync.newFolderPlaceholder': 'Nome della nuova cartella',
  'docsync.createFolder': 'Crea',
  'docsync.syncNow': 'Sincronizza ora',
  'docsync.unlink': 'Disconnetti',
  'docsync.syncEnabled': 'Sincronizza automaticamente',
  'docsync.direction': 'Direzione',
  'docsync.directionBoth': 'In entrambe le direzioni',
  'docsync.directionPull': 'Solo verso TREK',
  'docsync.directionPush': 'Solo verso il provider',
  'docsync.deletePolicy': 'Quando un documento viene eliminato',
  'docsync.deleteUnlink': 'Mantieni entrambe le copie, sciogli l’abbinamento',
  'docsync.deleteTrash': 'Sposta l’altra copia nel suo cestino',
  'docsync.webhookHint':
    'Incolla questo URL nel tuo provider per ricevere subito le modifiche. Senza, TREK controlla a intervalli regolari.',

  // Campi del modulo di connessione. Le chiavi rispecchiano la colonna `label` di
  // document_provider_fields, che salva un suffisso di chiave invece del testo.
  'docsync.providerUrl': 'Indirizzo',
  'docsync.providerApiToken': 'Token API',
  'docsync.providerApiKey': 'Chiave API',
  'docsync.providerAppPassword': 'Password per applicazioni',
  'docsync.providerAppToken': 'Token applicativo',
  'docsync.providerUsername': 'Nome utente',
  'docsync.providerPassword': 'Password',
  'docsync.providerOrganization': 'ID organizzazione',
  'docsync.providerBasePath': 'Cartella di base',
  'docsync.providerOTP': 'Codice a due fattori',
  'docsync.allowInsecureTls': 'Accetta un certificato autofirmato',

  'docsync.hintPaperlessToken': 'Crealo in Paperless sotto Il mio profilo. Ha tutti i diritti di quell’account.',
  'docsync.hintPapraKey':
    'Creala in Papra sotto Chiavi API. Le chiavi Papra raggiungono sempre tutte le organizzazioni a cui appartieni.',
  'docsync.hintPapraOrg': 'L’id org_… che compare nella barra degli indirizzi di Papra.',
  'docsync.hintNextcloudLogin': 'Il tuo nome utente Nextcloud, non l’indirizzo email.',
  'docsync.hintNextcloudAppPassword':
    'Impostazioni, Sicurezza, Crea nuova password per applicazioni. Mai la password del tuo account.',
  'docsync.hintOpenCloudToken': 'Si crea in OpenCloud sotto i token applicativi.',
  'docsync.hintBasePath': 'Dove TREK cerca le cartelle dei viaggi. Come impostazione predefinita /TREK.',
  'docsync.hintSynologyUrl': 'Indica anche la porta, per esempio https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Meglio un account DSM dedicato, con accesso solo a questa cartella condivisa.',
  'docsync.hintSynologyOtp': 'Serve una sola volta, se l’account usa l’autenticazione a due fattori.',

  'docsync.linkState.never': 'Non ancora sincronizzato',
  'docsync.linkState.ok': 'Allineato',
  'docsync.linkState.partial': 'Sincronizzato in parte',
  'docsync.linkState.failed': 'Non riuscito',
  'docsync.linkState.needs_reauth': 'Accedi di nuovo',
  'docsync.linkState.scope_lost': 'La cartella non c’è più',
  'docsync.linkState.orphaned': 'Il proprietario ha lasciato il viaggio',

  'docsync.state.pending': 'In attesa',
  'docsync.state.synced': 'Sincronizzato',
  'docsync.state.conflict': 'Conflitto',
  'docsync.state.rejected_type': 'Tipo non consentito',
  'docsync.state.too_large': 'Troppo grande',
  'docsync.state.error': 'Errore',
  'docsync.state.remote_missing': 'Assente sul provider',
  'docsync.state.local_deleted': 'Eliminato in TREK',
  'docsync.state.scope_drift': 'Spostato fuori dalla cartella',

  'docsync.conflict.title': 'Entrambe le copie sono cambiate',
  'docsync.conflict.keepTrek': 'Mantieni la versione di TREK',
  'docsync.conflict.keepProvider': 'Mantieni la versione del provider',
  'docsync.conflict.keepBoth': 'Mantieni entrambe',

  // I motivi di errore viaggiano come codici, mai come testo del provider: quello risponde
  // in inglese, oppure restituisce la pagina di accesso HTML di un proxy, e nessuna delle due
  // cose ha senso qui.
  'docsync.error.unreachable': 'Impossibile raggiungere il provider.',
  'docsync.error.tls_untrusted':
    'Il certificato è stato rifiutato. Consenti i certificati autofirmati se ti fidi di questa istanza.',
  'docsync.error.unauthorized': 'Le credenziali sono state rifiutate.',
  'docsync.error.forbidden': 'Questo account non è autorizzato a farlo.',
  'docsync.error.not_found': 'Non trovato sul provider.',
  'docsync.error.scope_missing': 'La cartella collegata non esiste più.',
  'docsync.error.rate_limited': 'Il provider sta limitando le richieste. TREK riproverà più tardi.',
  'docsync.error.too_large': 'Il file supera la dimensione accettata dal provider.',
  'docsync.error.unsupported_type': 'Il provider non accetta questo tipo di file.',
  'docsync.error.quota_exceeded': 'Il provider ha esaurito lo spazio.',
  'docsync.error.conflict': 'Il documento è cambiato da entrambe le parti.',
  'docsync.error.checksum_mismatch': 'Il trasferimento non è arrivato integro.',
  'docsync.error.provider_error': 'Il provider ha segnalato un errore.',
  'docsync.error.timeout': 'Il provider ha impiegato troppo tempo a rispondere.',
  'docsync.error.ssrf_blocked': 'Questo indirizzo non è consentito.',
  'docsync.error.mass_delete_guard':
    'Quasi tutti i documenti sono spariti in una volta, quindi non è stato modificato nulla. Controlla che la cartella sia ancora montata.',
  'docsync.error.unknown': 'Qualcosa è andato storto.',
  'docsync.error.unknown_provider': 'Questo provider non è disponibile su questa istanza.',
};

export default docsync;
