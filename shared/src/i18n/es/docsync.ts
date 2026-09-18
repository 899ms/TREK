import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Sincronización de documentos',
  'docsync.subtitle': 'Mantén los documentos de este viaje al día con tu propio gestor de documentos.',
  'docsync.noProviders': 'No hay proveedores de documentos disponibles',
  'docsync.noProvidersHint': 'Un administrador de la instancia los activa en Admin, Complementos, Documentos.',
  'docsync.addProvider': 'Conectar un proveedor',
  'docsync.test': 'Probar conexión',
  'docsync.connected': 'Conectado',
  'docsync.chooseFolder': 'Elegir carpeta',
  'docsync.chooseFolderHint':
    'Elige la carpeta, la etiqueta o el espacio que corresponde a este viaje. Solo se sincronizan los documentos que contiene.',
  'docsync.noFolders': 'Todavía no se ha encontrado nada en esta instancia.',
  'docsync.newFolderPlaceholder': 'Nombre de la nueva carpeta',
  'docsync.createFolder': 'Crear',
  'docsync.syncNow': 'Sincronizar ahora',
  'docsync.unlink': 'Desconectar',
  'docsync.syncEnabled': 'Sincronizar automáticamente',
  'docsync.direction': 'Dirección',
  'docsync.directionBoth': 'En ambos sentidos',
  'docsync.directionPull': 'Solo hacia TREK',
  'docsync.directionPush': 'Solo hacia el proveedor',
  'docsync.deletePolicy': 'Cuando se elimina un documento',
  'docsync.deleteUnlink': 'Conservar ambas copias y deshacer el emparejamiento',
  'docsync.deleteTrash': 'Mover la otra copia a su papelera',
  'docsync.webhookHint':
    'Pega esta URL en tu proveedor para que los cambios lleguen de inmediato. Sin ella, TREK comprueba cada cierto tiempo.',

  // Campos del formulario de conexión. Las claves reflejan la columna `label` de
  // document_provider_fields, que guarda un sufijo de clave en lugar de texto.
  'docsync.providerUrl': 'Dirección',
  'docsync.providerApiToken': 'Token de API',
  'docsync.providerApiKey': 'Clave de API',
  'docsync.providerAppPassword': 'Contraseña de aplicación',
  'docsync.providerAppToken': 'Token de aplicación',
  'docsync.providerUsername': 'Nombre de usuario',
  'docsync.providerPassword': 'Contraseña',
  'docsync.providerOrganization': 'ID de organización',
  'docsync.providerBasePath': 'Carpeta base',
  'docsync.providerOTP': 'Código de doble factor',
  'docsync.allowInsecureTls': 'Aceptar un certificado autofirmado',

  'docsync.hintPaperlessToken': 'Créalo en Paperless, en Mi perfil. Tiene todos los permisos de esa cuenta.',
  'docsync.hintPapraKey':
    'Créala en Papra, en Claves de API. Las claves de Papra siempre alcanzan a todas las organizaciones a las que perteneces.',
  'docsync.hintPapraOrg': 'El id org_… que aparece en la barra de direcciones de Papra.',
  'docsync.hintNextcloudLogin': 'Tu nombre de usuario de Nextcloud, no tu dirección de correo.',
  'docsync.hintNextcloudAppPassword':
    'Ajustes, Seguridad, Crear nueva contraseña de aplicación. Nunca la contraseña de tu cuenta.',
  'docsync.hintOpenCloudToken': 'Se crea en OpenCloud, en los tokens de aplicación.',
  'docsync.hintBasePath': 'Donde TREK busca las carpetas de los viajes. Por defecto, /TREK.',
  'docsync.hintSynologyUrl': 'Incluye el puerto, por ejemplo https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Mejor una cuenta DSM dedicada con acceso solo a esta carpeta compartida.',
  'docsync.hintSynologyOtp': 'Solo hace falta una vez, si la cuenta usa autenticación de doble factor.',

  'docsync.linkState.never': 'Aún sin sincronizar',
  'docsync.linkState.ok': 'Al día',
  'docsync.linkState.partial': 'Sincronizado en parte',
  'docsync.linkState.failed': 'Falló',
  'docsync.linkState.needs_reauth': 'Vuelve a iniciar sesión',
  'docsync.linkState.scope_lost': 'La carpeta ya no está',
  'docsync.linkState.orphaned': 'El propietario dejó el viaje',

  'docsync.state.pending': 'En espera',
  'docsync.state.synced': 'Sincronizado',
  'docsync.state.conflict': 'Conflicto',
  'docsync.state.rejected_type': 'Tipo no permitido',
  'docsync.state.too_large': 'Demasiado grande',
  'docsync.state.error': 'Error',
  'docsync.state.remote_missing': 'Falta en el proveedor',
  'docsync.state.local_deleted': 'Eliminado en TREK',
  'docsync.state.scope_drift': 'Fuera de la carpeta',

  'docsync.conflict.title': 'Las dos copias han cambiado',
  'docsync.conflict.keepTrek': 'Conservar la versión de TREK',
  'docsync.conflict.keepProvider': 'Conservar la versión del proveedor',
  'docsync.conflict.keepBoth': 'Conservar ambas',

  // Los motivos de fallo viajan como códigos, nunca como el texto del proveedor: este
  // responde en inglés, o devuelve la página de inicio de sesión HTML de un proxy, y ninguna
  // de las dos cosas pinta nada aquí.
  'docsync.error.unreachable': 'No se pudo contactar con el proveedor.',
  'docsync.error.tls_untrusted':
    'El certificado fue rechazado. Permite los certificados autofirmados si confías en esta instancia.',
  'docsync.error.unauthorized': 'Las credenciales fueron rechazadas.',
  'docsync.error.forbidden': 'Esta cuenta no tiene permiso para hacerlo.',
  'docsync.error.not_found': 'No se encontró en el proveedor.',
  'docsync.error.scope_missing': 'La carpeta conectada ya no existe.',
  'docsync.error.rate_limited': 'El proveedor está limitando las peticiones. TREK lo intentará más tarde.',
  'docsync.error.too_large': 'El archivo supera el tamaño que acepta el proveedor.',
  'docsync.error.unsupported_type': 'El proveedor no acepta este tipo de archivo.',
  'docsync.error.quota_exceeded': 'El proveedor se ha quedado sin espacio.',
  'docsync.error.conflict': 'El documento cambió en ambos lados.',
  'docsync.error.checksum_mismatch': 'La transferencia no llegó íntegra.',
  'docsync.error.provider_error': 'El proveedor informó de un error.',
  'docsync.error.timeout': 'El proveedor tardó demasiado en responder.',
  'docsync.error.ssrf_blocked': 'Esa dirección no está permitida.',
  'docsync.error.mass_delete_guard':
    'Desaparecieron casi todos los documentos a la vez, así que no se cambió nada. Comprueba que la carpeta siga montada.',
  'docsync.error.unknown': 'Algo salió mal.',
  'docsync.error.unknown_provider': 'Este proveedor no está disponible en esta instancia.',
};

export default docsync;
