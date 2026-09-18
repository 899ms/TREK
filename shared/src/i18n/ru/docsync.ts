import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Синхронизация документов',
  'docsync.subtitle': 'Держите документы этой поездки в одном состоянии с вашим собственным хранилищем документов.',
  'docsync.noProviders': 'Нет доступных провайдеров документов',
  'docsync.noProvidersHint':
    'Администратор экземпляра включает их в разделе «Администрирование → Дополнения → Документы».',
  'docsync.addProvider': 'Подключить провайдера',
  'docsync.test': 'Проверить подключение',
  'docsync.connected': 'Подключено',
  'docsync.chooseFolder': 'Выбрать папку',
  'docsync.chooseFolderHint':
    'Выберите папку, метку или пространство, которые относятся к этой поездке. Синхронизируются только документы из них.',
  'docsync.noFolders': 'В этом экземпляре пока ничего не найдено.',
  'docsync.newFolderPlaceholder': 'Название новой папки',
  'docsync.createFolder': 'Создать',
  'docsync.syncNow': 'Синхронизировать сейчас',
  'docsync.unlink': 'Отключить',
  'docsync.syncEnabled': 'Синхронизировать автоматически',
  'docsync.direction': 'Направление',
  'docsync.directionBoth': 'В обе стороны',
  'docsync.directionPull': 'Только в TREK',
  'docsync.directionPush': 'Только к провайдеру',
  'docsync.deletePolicy': 'Когда документ удалён',
  'docsync.deleteUnlink': 'Оставить обе копии, убрать связь',
  'docsync.deleteTrash': 'Переместить вторую копию в её корзину',
  'docsync.webhookHint':
    'Вставьте этот URL у своего провайдера, чтобы изменения приходили сразу. Без него TREK проверяет по таймеру.',

  // Поля формы подключения. Ключи повторяют столбец `label` в
  // document_provider_fields, где хранится суффикс ключа, а не текст.
  'docsync.providerUrl': 'Адрес',
  'docsync.providerApiToken': 'Токен API',
  'docsync.providerApiKey': 'Ключ API',
  'docsync.providerAppPassword': 'Пароль приложения',
  'docsync.providerAppToken': 'Токен приложения',
  'docsync.providerUsername': 'Имя пользователя',
  'docsync.providerPassword': 'Пароль',
  'docsync.providerOrganization': 'ID организации',
  'docsync.providerBasePath': 'Базовая папка',
  'docsync.providerOTP': 'Код двухфакторной проверки',
  'docsync.allowInsecureTls': 'Принимать самоподписанный сертификат',

  'docsync.hintPaperlessToken':
    'Создайте его в Paperless в разделе «Мой профиль». Он даёт все права этой учётной записи.',
  'docsync.hintPapraKey':
    'Создайте его в Papra в разделе «Ключи API». Ключи Papra всегда охватывают все организации, в которых вы состоите.',
  'docsync.hintPapraOrg': 'Идентификатор org_… из адресной строки Papra.',
  'docsync.hintNextcloudLogin': 'Ваше имя для входа в Nextcloud, а не адрес электронной почты.',
  'docsync.hintNextcloudAppPassword':
    '«Настройки → Безопасность → Создать новый пароль приложения». Никогда не пароль от учётной записи.',
  'docsync.hintOpenCloudToken': 'Создаётся в OpenCloud в разделе токенов приложений.',
  'docsync.hintBasePath': 'Где TREK ищет папки поездок. По умолчанию /TREK.',
  'docsync.hintSynologyUrl': 'Укажите порт, например https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Лучше отдельная учётная запись DSM с доступом только к этой общей папке.',
  'docsync.hintSynologyOtp': 'Нужен только один раз, если в учётной записи включена двухфакторная аутентификация.',

  'docsync.linkState.never': 'Ещё не синхронизировано',
  'docsync.linkState.ok': 'Всё синхронизировано',
  'docsync.linkState.partial': 'Синхронизировано частично',
  'docsync.linkState.failed': 'Не удалось',
  'docsync.linkState.needs_reauth': 'Войдите снова',
  'docsync.linkState.scope_lost': 'Папка исчезла',
  'docsync.linkState.orphaned': 'Владелец покинул поездку',

  'docsync.state.pending': 'Ожидает',
  'docsync.state.synced': 'Синхронизировано',
  'docsync.state.conflict': 'Конфликт',
  'docsync.state.rejected_type': 'Тип не разрешён',
  'docsync.state.too_large': 'Слишком большой',
  'docsync.state.error': 'Ошибка',
  'docsync.state.remote_missing': 'Отсутствует у провайдера',
  'docsync.state.local_deleted': 'Удалено в TREK',
  'docsync.state.scope_drift': 'Перемещено за пределы папки',

  'docsync.conflict.title': 'Изменились обе копии',
  'docsync.conflict.keepTrek': 'Оставить версию TREK',
  'docsync.conflict.keepProvider': 'Оставить версию провайдера',
  'docsync.conflict.keepBoth': 'Оставить обе',

  // Причины сбоя передаются кодами, а не текстом провайдера: он отвечает
  // по-английски или HTML-страницей входа от прокси, и ни тому, ни другому здесь не место.
  'docsync.error.unreachable': 'Не удалось связаться с провайдером.',
  'docsync.error.tls_untrusted':
    'Сертификат отклонён. Разрешите самоподписанные сертификаты, если доверяете этому экземпляру.',
  'docsync.error.unauthorized': 'Учётные данные отклонены.',
  'docsync.error.forbidden': 'Этой учётной записи такое не разрешено.',
  'docsync.error.not_found': 'У провайдера не найдено.',
  'docsync.error.scope_missing': 'Подключённой папки больше не существует.',
  'docsync.error.rate_limited': 'Провайдер ограничивает частоту запросов. TREK повторит попытку позже.',
  'docsync.error.too_large': 'Файл больше, чем принимает провайдер.',
  'docsync.error.unsupported_type': 'Провайдер не принимает файлы этого типа.',
  'docsync.error.quota_exceeded': 'У провайдера закончилось место.',
  'docsync.error.conflict': 'Документ изменился с обеих сторон.',
  'docsync.error.checksum_mismatch': 'Данные пришли повреждёнными.',
  'docsync.error.provider_error': 'Провайдер сообщил об ошибке.',
  'docsync.error.timeout': 'Провайдер слишком долго отвечал.',
  'docsync.error.ssrf_blocked': 'Этот адрес не разрешён.',
  'docsync.error.mass_delete_guard':
    'Сразу исчезло большинство документов, поэтому ничего не изменено. Проверьте, что папка всё ещё подключена.',
  'docsync.error.unknown': 'Что-то пошло не так.',
  'docsync.error.unknown_provider': 'Этот провайдер недоступен в этом экземпляре.',
};

export default docsync;
