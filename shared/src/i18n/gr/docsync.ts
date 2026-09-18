import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Συγχρονισμός εγγράφων',
  'docsync.subtitle': 'Κρατήστε τα έγγραφα αυτού του ταξιδιού στην ίδια κατάσταση με τον δικό σας χώρο εγγράφων.',
  'docsync.noProviders': 'Δεν υπάρχουν διαθέσιμοι πάροχοι εγγράφων',
  'docsync.noProvidersHint': 'Τους ενεργοποιεί ένας διαχειριστής της εγκατάστασης στο Διαχείριση → Πρόσθετα → Έγγραφα.',
  'docsync.addProvider': 'Σύνδεση παρόχου',
  'docsync.test': 'Δοκιμή σύνδεσης',
  'docsync.connected': 'Συνδεδεμένο',
  'docsync.chooseFolder': 'Επιλογή φακέλου',
  'docsync.chooseFolderHint':
    'Επιλέξτε τον φάκελο, την ετικέτα ή τον χώρο που ανήκει σε αυτό το ταξίδι. Συγχρονίζονται μόνο τα έγγραφα που βρίσκονται εκεί.',
  'docsync.noFolders': 'Δεν βρέθηκε ακόμη τίποτα σε αυτή την εγκατάσταση.',
  'docsync.newFolderPlaceholder': 'Όνομα νέου φακέλου',
  'docsync.createFolder': 'Δημιουργία',
  'docsync.syncNow': 'Συγχρονισμός τώρα',
  'docsync.unlink': 'Αποσύνδεση',
  'docsync.syncEnabled': 'Αυτόματος συγχρονισμός',
  'docsync.direction': 'Κατεύθυνση',
  'docsync.directionBoth': 'Και προς τις δύο κατευθύνσεις',
  'docsync.directionPull': 'Μόνο προς το TREK',
  'docsync.directionPush': 'Μόνο προς τον πάροχο',
  'docsync.deletePolicy': 'Όταν διαγράφεται ένα έγγραφο',
  'docsync.deleteUnlink': 'Διατήρηση και των δύο αντιγράφων, κατάργηση της αντιστοίχισης',
  'docsync.deleteTrash': 'Μετακίνηση του άλλου αντιγράφου στον κάδο του',
  'docsync.webhookHint':
    'Επικολλήστε αυτό το URL στον πάροχό σας ώστε οι αλλαγές να φτάνουν αμέσως. Χωρίς αυτό, το TREK ελέγχει ανά τακτά διαστήματα.',

  // Τα πεδία της φόρμας σύνδεσης. Τα κλειδιά αντικατοπτρίζουν τη στήλη `label` του
  // document_provider_fields, που αποθηκεύει κατάληξη κλειδιού και όχι κείμενο.
  'docsync.providerUrl': 'Διεύθυνση',
  'docsync.providerApiToken': 'Διακριτικό API',
  'docsync.providerApiKey': 'Κλειδί API',
  'docsync.providerAppPassword': 'Κωδικός εφαρμογής',
  'docsync.providerAppToken': 'Διακριτικό εφαρμογής',
  'docsync.providerUsername': 'Όνομα χρήστη',
  'docsync.providerPassword': 'Κωδικός πρόσβασης',
  'docsync.providerOrganization': 'Αναγνωριστικό οργανισμού',
  'docsync.providerBasePath': 'Βασικός φάκελος',
  'docsync.providerOTP': 'Κωδικός δύο παραγόντων',
  'docsync.allowInsecureTls': 'Αποδοχή αυτο-υπογεγραμμένου πιστοποιητικού',

  'docsync.hintPaperlessToken':
    'Δημιουργήστε το στο Paperless, στο Το προφίλ μου. Φέρει όλα τα δικαιώματα εκείνου του λογαριασμού.',
  'docsync.hintPapraKey':
    'Δημιουργήστε το στο Papra, στα κλειδιά API. Τα κλειδιά του Papra φτάνουν πάντα σε κάθε οργανισμό στον οποίο ανήκετε.',
  'docsync.hintPapraOrg': 'Το αναγνωριστικό org_… από τη γραμμή διευθύνσεων του Papra.',
  'docsync.hintNextcloudLogin': 'Το όνομα σύνδεσής σας στο Nextcloud, όχι η διεύθυνση email σας.',
  'docsync.hintNextcloudAppPassword':
    'Ρυθμίσεις → Ασφάλεια → Δημιουργία νέου κωδικού εφαρμογής. Ποτέ ο κωδικός του λογαριασμού σας.',
  'docsync.hintOpenCloudToken': 'Δημιουργείται στο OpenCloud, στα διακριτικά εφαρμογών.',
  'docsync.hintBasePath': 'Πού ψάχνει το TREK για φακέλους ταξιδιών. Προεπιλογή /TREK.',
  'docsync.hintSynologyUrl': 'Συμπεριλάβετε τη θύρα, για παράδειγμα https://nas.example.com:5001',
  'docsync.hintSynologyUser':
    'Καλύτερα ένας ξεχωριστός λογαριασμός DSM με πρόσβαση μόνο σε αυτόν τον κοινόχρηστο φάκελο.',
  'docsync.hintSynologyOtp': 'Χρειάζεται μόνο μία φορά, αν ο λογαριασμός χρησιμοποιεί ταυτοποίηση δύο παραγόντων.',

  'docsync.linkState.never': 'Δεν έχει συγχρονιστεί ακόμα',
  'docsync.linkState.ok': 'Σε συγχρονισμό',
  'docsync.linkState.partial': 'Μερικώς συγχρονισμένο',
  'docsync.linkState.failed': 'Απέτυχε',
  'docsync.linkState.needs_reauth': 'Συνδεθείτε ξανά',
  'docsync.linkState.scope_lost': 'Ο φάκελος χάθηκε',
  'docsync.linkState.orphaned': 'Ο κάτοχος αποχώρησε από το ταξίδι',

  'docsync.state.pending': 'Σε αναμονή',
  'docsync.state.synced': 'Συγχρονίστηκε',
  'docsync.state.conflict': 'Διένεξη',
  'docsync.state.rejected_type': 'Μη επιτρεπτός τύπος',
  'docsync.state.too_large': 'Πολύ μεγάλο',
  'docsync.state.error': 'Σφάλμα',
  'docsync.state.remote_missing': 'Λείπει από τον πάροχο',
  'docsync.state.local_deleted': 'Διαγράφηκε στο TREK',
  'docsync.state.scope_drift': 'Μετακινήθηκε εκτός του φακέλου',

  'docsync.conflict.title': 'Άλλαξαν και τα δύο αντίγραφα',
  'docsync.conflict.keepTrek': 'Διατήρηση της έκδοσης του TREK',
  'docsync.conflict.keepProvider': 'Διατήρηση της έκδοσης του παρόχου',
  'docsync.conflict.keepBoth': 'Διατήρηση και των δύο',

  // Οι λόγοι αποτυχίας ταξιδεύουν ως κωδικοί, ποτέ ως κείμενο του παρόχου: ένας πάροχος
  // απαντά στα αγγλικά ή με τη σελίδα σύνδεσης ενός διαμεσολαβητή σε HTML, και κανένα από
  // τα δύο δεν έχει θέση εδώ.
  'docsync.error.unreachable': 'Δεν ήταν δυνατή η επικοινωνία με τον πάροχο.',
  'docsync.error.tls_untrusted':
    'Το πιστοποιητικό απορρίφθηκε. Επιτρέψτε τα αυτο-υπογεγραμμένα πιστοποιητικά αν εμπιστεύεστε αυτή την εγκατάσταση.',
  'docsync.error.unauthorized': 'Τα διαπιστευτήρια απορρίφθηκαν.',
  'docsync.error.forbidden': 'Αυτός ο λογαριασμός δεν επιτρέπεται να το κάνει αυτό.',
  'docsync.error.not_found': 'Δεν βρέθηκε στον πάροχο.',
  'docsync.error.scope_missing': 'Ο συνδεδεμένος φάκελος δεν υπάρχει πλέον.',
  'docsync.error.rate_limited': 'Ο πάροχος περιορίζει τον ρυθμό των αιτημάτων. Το TREK θα δοκιμάσει ξανά αργότερα.',
  'docsync.error.too_large': 'Το αρχείο είναι μεγαλύτερο από όσο δέχεται ο πάροχος.',
  'docsync.error.unsupported_type': 'Ο πάροχος δεν δέχεται αυτόν τον τύπο αρχείου.',
  'docsync.error.quota_exceeded': 'Ο πάροχος δεν έχει άλλο χώρο.',
  'docsync.error.conflict': 'Το έγγραφο άλλαξε και στις δύο πλευρές.',
  'docsync.error.checksum_mismatch': 'Η μεταφορά δεν έφτασε ακέραιη.',
  'docsync.error.provider_error': 'Ο πάροχος ανέφερε σφάλμα.',
  'docsync.error.timeout': 'Ο πάροχος άργησε πολύ να απαντήσει.',
  'docsync.error.ssrf_blocked': 'Αυτή η διεύθυνση δεν επιτρέπεται.',
  'docsync.error.mass_delete_guard':
    'Τα περισσότερα έγγραφα εξαφανίστηκαν μονομιάς, οπότε δεν άλλαξε τίποτα. Ελέγξτε ότι ο φάκελος είναι ακόμη προσαρτημένος.',
  'docsync.error.unknown': 'Κάτι πήγε στραβά.',
  'docsync.error.unknown_provider': 'Αυτός ο πάροχος δεν είναι διαθέσιμος σε αυτή την εγκατάσταση.',
};

export default docsync;
