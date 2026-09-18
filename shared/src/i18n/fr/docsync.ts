import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Synchronisation des documents',
  'docsync.subtitle': 'Gardez les documents de ce voyage alignés sur votre propre gestionnaire de documents.',
  'docsync.noProviders': 'Aucun fournisseur de documents n’est disponible',
  'docsync.noProvidersHint': 'Un administrateur de l’instance les active dans Admin, Extensions, Documents.',
  'docsync.addProvider': 'Connecter un fournisseur',
  'docsync.test': 'Tester la connexion',
  'docsync.connected': 'Connecté',
  'docsync.chooseFolder': 'Choisir le dossier',
  'docsync.chooseFolderHint':
    'Choisissez le dossier, l’étiquette ou l’espace qui correspond à ce voyage. Seuls les documents qui s’y trouvent sont synchronisés.',
  'docsync.noFolders': 'Rien trouvé sur cette instance pour le moment.',
  'docsync.newFolderPlaceholder': 'Nom du nouveau dossier',
  'docsync.createFolder': 'Créer',
  'docsync.syncNow': 'Synchroniser maintenant',
  'docsync.unlink': 'Déconnecter',
  'docsync.syncEnabled': 'Synchroniser automatiquement',
  'docsync.direction': 'Sens',
  'docsync.directionBoth': 'Dans les deux sens',
  'docsync.directionPull': 'Uniquement vers TREK',
  'docsync.directionPush': 'Uniquement vers le fournisseur',
  'docsync.deletePolicy': 'À la suppression d’un document',
  'docsync.deleteUnlink': 'Garder les deux copies, rompre l’association',
  'docsync.deleteTrash': 'Mettre l’autre copie à la corbeille',
  'docsync.webhookHint':
    'Collez cette URL chez votre fournisseur pour que les changements arrivent immédiatement. Sans cela, TREK vérifie à intervalles réguliers.',

  // Champs du formulaire de connexion. Les clés reprennent la colonne `label` de
  // document_provider_fields, qui stocke un suffixe de clé plutôt qu’un texte.
  'docsync.providerUrl': 'Adresse',
  'docsync.providerApiToken': 'Jeton API',
  'docsync.providerApiKey': 'Clé API',
  'docsync.providerAppPassword': 'Mot de passe d’application',
  'docsync.providerAppToken': 'Jeton d’application',
  'docsync.providerUsername': 'Nom d’utilisateur',
  'docsync.providerPassword': 'Mot de passe',
  'docsync.providerOrganization': 'ID d’organisation',
  'docsync.providerBasePath': 'Dossier de base',
  'docsync.providerOTP': 'Code à deux facteurs',
  'docsync.allowInsecureTls': 'Accepter un certificat auto-signé',

  'docsync.hintPaperlessToken': 'À créer dans Paperless sous Mon profil. Il donne tous les droits de ce compte.',
  'docsync.hintPapraKey':
    'À créer dans Papra sous Clés API. Une clé Papra atteint toujours toutes les organisations dont vous faites partie.',
  'docsync.hintPapraOrg': 'L’identifiant org_… affiché dans la barre d’adresse de Papra.',
  'docsync.hintNextcloudLogin': 'Votre identifiant de connexion Nextcloud, pas votre adresse e-mail.',
  'docsync.hintNextcloudAppPassword':
    'Paramètres, Sécurité, Créer un nouveau mot de passe d’application. Jamais le mot de passe de votre compte.',
  'docsync.hintOpenCloudToken': 'À créer dans OpenCloud sous les jetons d’application.',
  'docsync.hintBasePath': 'Là où TREK cherche les dossiers de voyage. Par défaut /TREK.',
  'docsync.hintSynologyUrl': 'Indiquez le port, par exemple https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'De préférence un compte DSM dédié, avec accès à ce seul dossier partagé.',
  'docsync.hintSynologyOtp': 'Nécessaire une seule fois, si le compte utilise l’authentification à deux facteurs.',

  'docsync.linkState.never': 'Pas encore synchronisé',
  'docsync.linkState.ok': 'À jour',
  'docsync.linkState.partial': 'Partiellement synchronisé',
  'docsync.linkState.failed': 'Échec',
  'docsync.linkState.needs_reauth': 'Reconnectez-vous',
  'docsync.linkState.scope_lost': 'Dossier introuvable',
  'docsync.linkState.orphaned': 'Le propriétaire a quitté le voyage',

  'docsync.state.pending': 'En attente',
  'docsync.state.synced': 'Synchronisé',
  'docsync.state.conflict': 'Conflit',
  'docsync.state.rejected_type': 'Type non autorisé',
  'docsync.state.too_large': 'Trop volumineux',
  'docsync.state.error': 'Erreur',
  'docsync.state.remote_missing': 'Absent chez le fournisseur',
  'docsync.state.local_deleted': 'Supprimé dans TREK',
  'docsync.state.scope_drift': 'Sorti du dossier',

  'docsync.conflict.title': 'Les deux copies ont changé',
  'docsync.conflict.keepTrek': 'Garder la version TREK',
  'docsync.conflict.keepProvider': 'Garder la version du fournisseur',
  'docsync.conflict.keepBoth': 'Garder les deux',

  // Les causes d’échec circulent sous forme de codes, jamais de texte venu du fournisseur :
  // celui-ci répond en anglais, ou renvoie la page de connexion HTML d’un proxy, et ni l’un
  // ni l’autre n’a sa place ici.
  'docsync.error.unreachable': 'Le fournisseur n’a pas pu être joint.',
  'docsync.error.tls_untrusted':
    'Le certificat a été rejeté. Autorisez les certificats auto-signés si vous faites confiance à cette instance.',
  'docsync.error.unauthorized': 'Les identifiants ont été refusés.',
  'docsync.error.forbidden': 'Ce compte n’a pas le droit de faire cela.',
  'docsync.error.not_found': 'Introuvable chez le fournisseur.',
  'docsync.error.scope_missing': 'Le dossier connecté n’existe plus.',
  'docsync.error.rate_limited': 'Le fournisseur limite nos requêtes. TREK réessaiera plus tard.',
  'docsync.error.too_large': 'Le fichier dépasse la taille acceptée par le fournisseur.',
  'docsync.error.unsupported_type': 'Le fournisseur n’accepte pas ce type de fichier.',
  'docsync.error.quota_exceeded': 'Le fournisseur n’a plus d’espace libre.',
  'docsync.error.conflict': 'Le document a changé des deux côtés.',
  'docsync.error.checksum_mismatch': 'Le transfert n’est pas arrivé intact.',
  'docsync.error.provider_error': 'Le fournisseur a signalé une erreur.',
  'docsync.error.timeout': 'Le fournisseur a mis trop de temps à répondre.',
  'docsync.error.ssrf_blocked': 'Cette adresse n’est pas autorisée.',
  'docsync.error.mass_delete_guard':
    'La plupart des documents ont disparu d’un coup, rien n’a donc été modifié. Vérifiez que le dossier est toujours monté.',
  'docsync.error.unknown': 'Une erreur est survenue.',
  'docsync.error.unknown_provider': 'Ce fournisseur n’est pas disponible sur cette instance.',
};

export default docsync;
