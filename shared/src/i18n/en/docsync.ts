import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Document sync',
  'docsync.subtitle': "Keep this trip's documents in step with your own document store.",
  'docsync.noProviders': 'No document providers are available',
  'docsync.noProvidersHint': 'An instance administrator switches these on under Admin, Addons, Documents.',
  'docsync.addProvider': 'Connect a provider',
  'docsync.test': 'Test connection',
  'docsync.connected': 'Connected',
  'docsync.chooseFolder': 'Choose folder',
  'docsync.chooseFolderHint':
    'Pick the folder, tag or space that belongs to this trip. Only documents in it are synced.',
  'docsync.noFolders': 'Nothing found on this instance yet.',
  'docsync.newFolderPlaceholder': 'New folder name',
  'docsync.createFolder': 'Create',
  'docsync.syncNow': 'Sync now',
  'docsync.unlink': 'Disconnect',
  'docsync.syncEnabled': 'Sync automatically',
  'docsync.direction': 'Direction',
  'docsync.directionBoth': 'Both ways',
  'docsync.directionPull': 'Only into TREK',
  'docsync.directionPush': 'Only out to the provider',
  'docsync.deletePolicy': 'When a document is deleted',
  'docsync.deleteUnlink': 'Keep both copies, drop the pairing',
  'docsync.deleteTrash': 'Move the other copy to its recycle bin',
  'docsync.webhookHint':
    'Paste this URL into your provider so changes arrive immediately. Without it, TREK checks on a timer.',

  // Connection form fields. The keys mirror the `label` column in
  // document_provider_fields, which stores a key suffix rather than text.
  'docsync.providerUrl': 'Address',
  'docsync.providerApiToken': 'API token',
  'docsync.providerApiKey': 'API key',
  'docsync.providerAppPassword': 'App password',
  'docsync.providerAppToken': 'App token',
  'docsync.providerUsername': 'Username',
  'docsync.providerPassword': 'Password',
  'docsync.providerOrganization': 'Organisation ID',
  'docsync.providerBasePath': 'Base folder',
  'docsync.providerOTP': 'Two-factor code',
  'docsync.allowInsecureTls': 'Accept a self-signed certificate',

  'docsync.hintPaperlessToken': "Create one under My Profile in Paperless. It carries that account's full rights.",
  'docsync.hintPapraKey':
    'Create one under API keys in Papra. Papra keys always reach every organisation you belong to.',
  'docsync.hintPapraOrg': 'The org_… id from the Papra address bar.',
  'docsync.hintNextcloudLogin': 'Your Nextcloud login name, not your email address.',
  'docsync.hintNextcloudAppPassword': 'Settings, Security, Create new app password. Never your account password.',
  'docsync.hintOpenCloudToken': 'Created under app tokens in OpenCloud.',
  'docsync.hintBasePath': 'Where TREK looks for trip folders. Defaults to /TREK.',
  'docsync.hintSynologyUrl': 'Include the port, for example https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Best a dedicated DSM account with access to just this shared folder.',
  'docsync.hintSynologyOtp': 'Only needed once, if the account uses two-factor authentication.',

  'docsync.linkState.never': 'Not synced yet',
  'docsync.linkState.ok': 'In sync',
  'docsync.linkState.partial': 'Partly synced',
  'docsync.linkState.failed': 'Failed',
  'docsync.linkState.needs_reauth': 'Sign in again',
  'docsync.linkState.scope_lost': 'Folder is gone',
  'docsync.linkState.orphaned': 'Owner left the trip',

  'docsync.state.pending': 'Waiting',
  'docsync.state.synced': 'Synced',
  'docsync.state.conflict': 'Conflict',
  'docsync.state.rejected_type': 'Type not allowed',
  'docsync.state.too_large': 'Too large',
  'docsync.state.error': 'Error',
  'docsync.state.remote_missing': 'Missing at the provider',
  'docsync.state.local_deleted': 'Deleted in TREK',
  'docsync.state.scope_drift': 'Moved out of the folder',

  'docsync.conflict.title': 'Both copies changed',
  'docsync.conflict.keepTrek': 'Keep the TREK version',
  'docsync.conflict.keepProvider': 'Keep the provider version',
  'docsync.conflict.keepBoth': 'Keep both',

  // Failure reasons travel as codes, never as upstream text: a provider answers
  // in English, or with a proxy's HTML login page, and neither belongs here.
  'docsync.error.unreachable': 'The provider could not be reached.',
  'docsync.error.tls_untrusted':
    'The certificate was rejected. Allow self-signed certificates if you trust this instance.',
  'docsync.error.unauthorized': 'The credentials were refused.',
  'docsync.error.forbidden': 'This account is not allowed to do that.',
  'docsync.error.not_found': 'Not found on the provider.',
  'docsync.error.scope_missing': 'The connected folder no longer exists.',
  'docsync.error.rate_limited': 'The provider is rate limiting us. TREK will try again later.',
  'docsync.error.too_large': 'The file is larger than the provider accepts.',
  'docsync.error.unsupported_type': 'The provider does not accept this file type.',
  'docsync.error.quota_exceeded': 'The provider is out of space.',
  'docsync.error.conflict': 'The document changed on both sides.',
  'docsync.error.checksum_mismatch': 'The transfer did not arrive intact.',
  'docsync.error.provider_error': 'The provider reported an error.',
  'docsync.error.timeout': 'The provider took too long to answer.',
  'docsync.error.ssrf_blocked': 'That address is not allowed.',
  'docsync.error.mass_delete_guard':
    'Most documents vanished at once, so nothing was changed. Check that the folder is still mounted.',
  'docsync.error.unknown': 'Something went wrong.',
  'docsync.error.unknown_provider': 'This provider is not available on this instance.',
};

export default docsync;
