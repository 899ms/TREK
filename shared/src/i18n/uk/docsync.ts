import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Синхронізація документів',
  'docsync.subtitle': 'Тримайте документи цієї подорожі узгодженими з власним сховищем документів.',
  'docsync.noProviders': 'Немає доступних постачальників документів',
  'docsync.noProvidersHint': 'Адміністратор сервера вмикає їх у розділі Адміністрування → Доповнення → Документи.',
  'docsync.addProvider': 'Підключити постачальника',
  'docsync.test': 'Перевірити з’єднання',
  'docsync.connected': 'Підключено',
  'docsync.chooseFolder': 'Вибрати теку',
  'docsync.chooseFolderHint':
    'Оберіть теку, мітку або простір, що належить цій подорожі. Синхронізуються лише документи в ній.',
  'docsync.noFolders': 'На цьому сервері поки нічого не знайдено.',
  'docsync.newFolderPlaceholder': 'Назва нової теки',
  'docsync.createFolder': 'Створити',
  'docsync.syncNow': 'Синхронізувати зараз',
  'docsync.unlink': 'Відключити',
  'docsync.syncEnabled': 'Синхронізувати автоматично',
  'docsync.direction': 'Напрямок',
  'docsync.directionBoth': 'В обидва боки',
  'docsync.directionPull': 'Лише в TREK',
  'docsync.directionPush': 'Лише до постачальника',
  'docsync.deletePolicy': 'Коли документ видалено',
  'docsync.deleteUnlink': 'Зберегти обидві копії, розірвати зв’язок',
  'docsync.deleteTrash': 'Перемістити другу копію до її кошика',
  'docsync.webhookHint':
    'Вставте цю URL-адресу у свого постачальника, щоб зміни надходили одразу. Без цього TREK перевіряє їх за таймером.',

  // Поля форми підключення. Ключі відповідають стовпцю `label` у таблиці
  // document_provider_fields, яка зберігає суфікс ключа, а не текст.
  'docsync.providerUrl': 'Адреса',
  'docsync.providerApiToken': 'Токен API',
  'docsync.providerApiKey': 'Ключ API',
  'docsync.providerAppPassword': 'Пароль додатка',
  'docsync.providerAppToken': 'Токен додатка',
  'docsync.providerUsername': 'Ім’я користувача',
  'docsync.providerPassword': 'Пароль',
  'docsync.providerOrganization': 'Ідентифікатор організації',
  'docsync.providerBasePath': 'Базова тека',
  'docsync.providerOTP': 'Код двофакторної автентифікації',
  'docsync.allowInsecureTls': 'Приймати самопідписаний сертифікат',

  'docsync.hintPaperlessToken':
    'Створіть його в Paperless-ngx у розділі My Profile. Він має всі права цього облікового запису.',
  'docsync.hintPapraKey':
    'Створіть його в Papra у розділі API keys. Ключі Papra завжди охоплюють усі організації, до яких ви належите.',
  'docsync.hintPapraOrg': 'Ідентифікатор org_… з адресного рядка Papra.',
  'docsync.hintNextcloudLogin': 'Ваше ім’я для входу в Nextcloud, а не адреса електронної пошти.',
  'docsync.hintNextcloudAppPassword':
    'Налаштування → Безпека → Створити новий пароль додатка. Ніколи не пароль облікового запису.',
  'docsync.hintOpenCloudToken': 'Створюється в OpenCloud у розділі токенів додатків.',
  'docsync.hintBasePath': 'Де TREK шукає теки подорожей. Типово /TREK.',
  'docsync.hintSynologyUrl': 'Вкажіть і порт, наприклад https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Найкраще окремий обліковий запис DSM з доступом лише до цієї спільної теки.',
  'docsync.hintSynologyOtp': 'Потрібен лише один раз, якщо обліковий запис використовує двофакторну автентифікацію.',

  'docsync.linkState.never': 'Ще не синхронізовано',
  'docsync.linkState.ok': 'Актуально',
  'docsync.linkState.partial': 'Синхронізовано частково',
  'docsync.linkState.failed': 'Помилка',
  'docsync.linkState.needs_reauth': 'Увійдіть знову',
  'docsync.linkState.scope_lost': 'Теки більше немає',
  'docsync.linkState.orphaned': 'Власник залишив подорож',

  'docsync.state.pending': 'Очікує',
  'docsync.state.synced': 'Синхронізовано',
  'docsync.state.conflict': 'Конфлікт',
  'docsync.state.rejected_type': 'Тип не дозволено',
  'docsync.state.too_large': 'Завеликий',
  'docsync.state.error': 'Помилка',
  'docsync.state.remote_missing': 'Відсутній у постачальника',
  'docsync.state.local_deleted': 'Видалено в TREK',
  'docsync.state.scope_drift': 'Переміщено за межі теки',

  'docsync.conflict.title': 'Змінилися обидві копії',
  'docsync.conflict.keepTrek': 'Залишити версію TREK',
  'docsync.conflict.keepProvider': 'Залишити версію постачальника',
  'docsync.conflict.keepBoth': 'Залишити обидві',

  // Причини збоїв передаються як коди, ніколи як текст від постачальника:
  // той відповідає англійською або HTML-сторінкою входу проксі, і ні те, ні інше сюди не належить.
  'docsync.error.unreachable': 'Не вдалося зв’язатися з постачальником.',
  'docsync.error.tls_untrusted':
    'Сертифікат відхилено. Дозвольте самопідписані сертифікати, якщо довіряєте цьому серверу.',
  'docsync.error.unauthorized': 'Облікові дані відхилено.',
  'docsync.error.forbidden': 'Цей обліковий запис не має на це дозволу.',
  'docsync.error.not_found': 'Не знайдено в постачальника.',
  'docsync.error.scope_missing': 'Підключеної теки більше не існує.',
  'docsync.error.rate_limited': 'Постачальник обмежує частоту запитів. TREK спробує ще раз пізніше.',
  'docsync.error.too_large': 'Файл більший, ніж приймає постачальник.',
  'docsync.error.unsupported_type': 'Постачальник не приймає цей тип файлу.',
  'docsync.error.quota_exceeded': 'У постачальника закінчилося місце.',
  'docsync.error.conflict': 'Документ змінився з обох боків.',
  'docsync.error.checksum_mismatch': 'Передача надійшла пошкодженою.',
  'docsync.error.provider_error': 'Постачальник повідомив про помилку.',
  'docsync.error.timeout': 'Постачальник відповідав надто довго.',
  'docsync.error.ssrf_blocked': 'Ця адреса не дозволена.',
  'docsync.error.mass_delete_guard':
    'Більшість документів зникла одночасно, тому нічого не змінено. Перевірте, чи теку досі підключено.',
  'docsync.error.unknown': 'Щось пішло не так.',
  'docsync.error.unknown_provider': 'Цей постачальник недоступний на цьому сервері.',
};

export default docsync;
