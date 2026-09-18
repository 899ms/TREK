import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'ドキュメント同期',
  'docsync.subtitle': 'この旅行のドキュメントを、自分のドキュメント保管先と同じ状態に保ちます。',
  'docsync.noProviders': '利用できる連携先がありません',
  'docsync.noProvidersHint': 'インスタンスの管理者が「管理 → アドオン → ドキュメント」で有効にします。',
  'docsync.addProvider': '連携先を接続',
  'docsync.test': '接続をテスト',
  'docsync.connected': '接続済み',
  'docsync.chooseFolder': 'フォルダーを選択',
  'docsync.chooseFolderHint':
    'この旅行に対応するフォルダー、タグ、スペースを選びます。その中のドキュメントだけが同期されます。',
  'docsync.noFolders': 'このインスタンスにはまだ何もありません。',
  'docsync.newFolderPlaceholder': '新しいフォルダー名',
  'docsync.createFolder': '作成',
  'docsync.syncNow': '今すぐ同期',
  'docsync.unlink': '接続解除',
  'docsync.syncEnabled': '自動で同期',
  'docsync.direction': '方向',
  'docsync.directionBoth': '双方向',
  'docsync.directionPull': 'TREK に取り込むだけ',
  'docsync.directionPush': '連携先へ送るだけ',
  'docsync.deletePolicy': 'ドキュメントが削除されたとき',
  'docsync.deleteUnlink': '両方のコピーを残し、対応付けだけを解除する',
  'docsync.deleteTrash': 'もう一方のコピーをゴミ箱へ移動する',
  'docsync.webhookHint':
    'この URL を連携先に貼り付けると、変更がすぐに届きます。設定しない場合、TREK は一定間隔で確認します。',

  // 接続フォームの項目。キーは document_provider_fields の `label` 列に対応し、
  // この列にはテキストではなくキーの末尾だけが入ります。
  'docsync.providerUrl': 'アドレス',
  'docsync.providerApiToken': 'API トークン',
  'docsync.providerApiKey': 'API キー',
  'docsync.providerAppPassword': 'アプリパスワード',
  'docsync.providerAppToken': 'アプリトークン',
  'docsync.providerUsername': 'ユーザー名',
  'docsync.providerPassword': 'パスワード',
  'docsync.providerOrganization': '組織 ID',
  'docsync.providerBasePath': '基準フォルダー',
  'docsync.providerOTP': '二段階認証コード',
  'docsync.allowInsecureTls': '自己署名証明書を許可',

  'docsync.hintPaperlessToken': 'Paperless の「My Profile」で作成します。そのアカウントの権限をすべて引き継ぎます。',
  'docsync.hintPapraKey': 'Papra の「API keys」で作成します。Papra のキーは所属するすべての組織に届きます。',
  'docsync.hintPapraOrg': 'Papra のアドレスバーに表示される org_… の ID です。',
  'docsync.hintNextcloudLogin': 'Nextcloud のログイン名です。メールアドレスではありません。',
  'docsync.hintNextcloudAppPassword':
    '「設定 → セキュリティ → 新しいアプリパスワードを作成」で発行します。アカウントのパスワードは使わないでください。',
  'docsync.hintOpenCloudToken': 'OpenCloud のアプリトークンとして作成します。',
  'docsync.hintBasePath': 'TREK が旅行用フォルダーを探す場所です。既定は /TREK です。',
  'docsync.hintSynologyUrl': 'ポート番号も含めてください。例：https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'この共有フォルダーだけにアクセスできる専用の DSM アカウントが最適です。',
  'docsync.hintSynologyOtp': 'アカウントで二段階認証を使っている場合に、最初の一度だけ必要です。',

  'docsync.linkState.never': 'まだ同期していません',
  'docsync.linkState.ok': '同期済み',
  'docsync.linkState.partial': '一部のみ同期',
  'docsync.linkState.failed': '失敗',
  'docsync.linkState.needs_reauth': '再度サインインしてください',
  'docsync.linkState.scope_lost': 'フォルダーが見つかりません',
  'docsync.linkState.orphaned': '所有者が旅行から抜けました',

  'docsync.state.pending': '待機中',
  'docsync.state.synced': '同期済み',
  'docsync.state.conflict': '競合',
  'docsync.state.rejected_type': '許可されていない形式',
  'docsync.state.too_large': 'サイズ超過',
  'docsync.state.error': 'エラー',
  'docsync.state.remote_missing': '連携先に見つかりません',
  'docsync.state.local_deleted': 'TREK で削除済み',
  'docsync.state.scope_drift': 'フォルダー外へ移動',

  'docsync.conflict.title': '両方のコピーが変更されました',
  'docsync.conflict.keepTrek': 'TREK のバージョンを残す',
  'docsync.conflict.keepProvider': '連携先のバージョンを残す',
  'docsync.conflict.keepBoth': '両方を残す',

  // 失敗の理由はコードとして扱い、連携先の文面をそのまま出しません。相手は英語で
  // 応答したり、プロキシのログイン画面の HTML を返したりするためです。
  'docsync.error.unreachable': '連携先に接続できませんでした。',
  'docsync.error.tls_untrusted':
    '証明書が拒否されました。このインスタンスを信頼できる場合は、自己署名証明書を許可してください。',
  'docsync.error.unauthorized': '認証情報が拒否されました。',
  'docsync.error.forbidden': 'このアカウントにはその権限がありません。',
  'docsync.error.not_found': '連携先に見つかりませんでした。',
  'docsync.error.scope_missing': '接続されたフォルダーはすでに存在しません。',
  'docsync.error.rate_limited': '連携先が要求を制限しています。TREK が後でもう一度試します。',
  'docsync.error.too_large': 'このファイルは連携先が受け付けるサイズを超えています。',
  'docsync.error.unsupported_type': '連携先はこのファイル形式を受け付けません。',
  'docsync.error.quota_exceeded': '連携先の空き容量がありません。',
  'docsync.error.conflict': 'このドキュメントは両方で変更されました。',
  'docsync.error.checksum_mismatch': '転送が完全な形で届きませんでした。',
  'docsync.error.provider_error': '連携先がエラーを返しました。',
  'docsync.error.timeout': '連携先の応答に時間がかかりすぎました。',
  'docsync.error.ssrf_blocked': 'このアドレスは許可されていません。',
  'docsync.error.mass_delete_guard':
    '多数のドキュメントが一度に消えたため、何も変更しませんでした。フォルダーがまだマウントされているか確認してください。',
  'docsync.error.unknown': '問題が発生しました。',
  'docsync.error.unknown_provider': 'この連携先はこのインスタンスでは利用できません。',
};

export default docsync;
