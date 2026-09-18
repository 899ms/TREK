import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Sincronització de documents',
  'docsync.subtitle': 'Mantén els documents d’aquest viatge en sintonia amb el teu propi gestor de documents.',
  'docsync.noProviders': 'No hi ha cap proveïdor de documents disponible',
  'docsync.noProvidersHint': 'Un administrador de la instància els activa a Administració, Complements, Documents.',
  'docsync.addProvider': 'Connecta un proveïdor',
  'docsync.test': 'Prova la connexió',
  'docsync.connected': 'Connectat',
  'docsync.chooseFolder': 'Tria una carpeta',
  'docsync.chooseFolderHint':
    'Tria la carpeta, l’etiqueta o l’espai que pertany a aquest viatge. Només se’n sincronitzen els documents que hi ha a dins.',
  'docsync.noFolders': 'Encara no s’ha trobat res en aquesta instància.',
  'docsync.newFolderPlaceholder': 'Nom de la carpeta nova',
  'docsync.createFolder': 'Crea',
  'docsync.syncNow': 'Sincronitza ara',
  'docsync.unlink': 'Desconnecta',
  'docsync.syncEnabled': 'Sincronitza automàticament',
  'docsync.direction': 'Direcció',
  'docsync.directionBoth': 'En tots dos sentits',
  'docsync.directionPull': 'Només cap a TREK',
  'docsync.directionPush': 'Només cap al proveïdor',
  'docsync.deletePolicy': 'Quan s’elimina un document',
  'docsync.deleteUnlink': 'Conserva les dues còpies i desfés l’aparellament',
  'docsync.deleteTrash': 'Mou l’altra còpia a la seva paperera',
  'docsync.webhookHint':
    'Enganxa aquesta URL al teu proveïdor perquè els canvis arribin de seguida. Sense això, TREK ho comprova cada cert temps.',

  // Camps del formulari de connexió. Les claus reflecteixen la columna `label` de
  // document_provider_fields, que desa un sufix de clau i no pas el text.
  'docsync.providerUrl': 'Adreça',
  'docsync.providerApiToken': 'Token API',
  'docsync.providerApiKey': 'Clau API',
  'docsync.providerAppPassword': 'Contrasenya d’aplicació',
  'docsync.providerAppToken': 'Token d’aplicació',
  'docsync.providerUsername': 'Nom d’usuari',
  'docsync.providerPassword': 'Contrasenya',
  'docsync.providerOrganization': 'ID d’organització',
  'docsync.providerBasePath': 'Carpeta base',
  'docsync.providerOTP': 'Codi de doble factor',
  'docsync.allowInsecureTls': 'Accepta un certificat autosignat',

  'docsync.hintPaperlessToken': 'Crea’l a El meu perfil, dins de Paperless. Té tots els drets d’aquell compte.',
  'docsync.hintPapraKey':
    'Crea-la a Claus API, dins de Papra. Les claus de Papra sempre arriben a totes les organitzacions a què pertanys.',
  'docsync.hintPapraOrg': 'L’id org_… de la barra d’adreces de Papra.',
  'docsync.hintNextcloudLogin': 'El teu nom d’usuari de Nextcloud, no pas la teva adreça electrònica.',
  'docsync.hintNextcloudAppPassword':
    'Configuració, Seguretat, Crea una contrasenya d’aplicació nova. Mai la contrasenya del compte.',
  'docsync.hintOpenCloudToken': 'Es crea als tokens d’aplicació d’OpenCloud.',
  'docsync.hintBasePath': 'On busca TREK les carpetes dels viatges. Per defecte, /TREK.',
  'docsync.hintSynologyUrl': 'Inclou-hi el port, per exemple https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Millor un compte DSM dedicat amb accés només a aquesta carpeta compartida.',
  'docsync.hintSynologyOtp': 'Només cal un cop, si el compte fa servir autenticació de doble factor.',

  'docsync.linkState.never': 'Encara no s’ha sincronitzat',
  'docsync.linkState.ok': 'Al dia',
  'docsync.linkState.partial': 'Sincronitzat en part',
  'docsync.linkState.failed': 'Ha fallat',
  'docsync.linkState.needs_reauth': 'Torna a iniciar la sessió',
  'docsync.linkState.scope_lost': 'La carpeta ha desaparegut',
  'docsync.linkState.orphaned': 'El propietari ha deixat el viatge',

  'docsync.state.pending': 'En espera',
  'docsync.state.synced': 'Sincronitzat',
  'docsync.state.conflict': 'Conflicte',
  'docsync.state.rejected_type': 'Tipus no permès',
  'docsync.state.too_large': 'Massa gran',
  'docsync.state.error': 'Error',
  'docsync.state.remote_missing': 'No hi és, al proveïdor',
  'docsync.state.local_deleted': 'Eliminat a TREK',
  'docsync.state.scope_drift': 'Ha sortit de la carpeta',

  'docsync.conflict.title': 'Han canviat totes dues còpies',
  'docsync.conflict.keepTrek': 'Conserva la versió de TREK',
  'docsync.conflict.keepProvider': 'Conserva la versió del proveïdor',
  'docsync.conflict.keepBoth': 'Conserva-les totes dues',

  // Els motius de fallada viatgen com a codis, mai com a text de l’altra banda:
  // un proveïdor respon en anglès, o amb la pàgina de login HTML d’un proxy, i
  // cap de les dues coses no hi pinta res.
  'docsync.error.unreachable': 'No s’ha pogut contactar amb el proveïdor.',
  'docsync.error.tls_untrusted':
    'El certificat s’ha rebutjat. Permet els certificats autosignats si confies en aquesta instància.',
  'docsync.error.unauthorized': 'S’han rebutjat les credencials.',
  'docsync.error.forbidden': 'Aquest compte no té permís per fer-ho.',
  'docsync.error.not_found': 'No s’ha trobat al proveïdor.',
  'docsync.error.scope_missing': 'La carpeta connectada ja no existeix.',
  'docsync.error.rate_limited': 'El proveïdor ens està limitant el ritme. TREK ho tornarà a provar més tard.',
  'docsync.error.too_large': 'El fitxer és més gran del que accepta el proveïdor.',
  'docsync.error.unsupported_type': 'El proveïdor no accepta aquest tipus de fitxer.',
  'docsync.error.quota_exceeded': 'El proveïdor s’ha quedat sense espai.',
  'docsync.error.conflict': 'El document ha canviat a totes dues bandes.',
  'docsync.error.checksum_mismatch': 'La transferència no ha arribat intacta.',
  'docsync.error.provider_error': 'El proveïdor ha informat d’un error.',
  'docsync.error.timeout': 'El proveïdor ha trigat massa a respondre.',
  'docsync.error.ssrf_blocked': 'Aquesta adreça no està permesa.',
  'docsync.error.mass_delete_guard':
    'Han desaparegut molts documents de cop, així que no s’ha canviat res. Comprova que la carpeta encara estigui muntada.',
  'docsync.error.unknown': 'Alguna cosa ha anat malament.',
  'docsync.error.unknown_provider': 'Aquest proveïdor no està disponible en aquesta instància.',
};

export default docsync;
