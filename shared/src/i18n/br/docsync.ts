import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Sincronização de documentos',
  'docsync.subtitle': 'Mantenha os documentos desta viagem em sintonia com o seu próprio repositório de documentos.',
  'docsync.noProviders': 'Nenhum provedor de documentos está disponível',
  'docsync.noProvidersHint': 'Um administrador da instância ativa isso em Admin, Complementos, Documentos.',
  'docsync.addProvider': 'Conectar um provedor',
  'docsync.test': 'Testar conexão',
  'docsync.connected': 'Conectado',
  'docsync.chooseFolder': 'Escolher pasta',
  'docsync.chooseFolderHint':
    'Escolha a pasta, a etiqueta ou o espaço que pertence a esta viagem. Só os documentos que estão nele são sincronizados.',
  'docsync.noFolders': 'Nada encontrado nesta instância ainda.',
  'docsync.newFolderPlaceholder': 'Nome da nova pasta',
  'docsync.createFolder': 'Criar',
  'docsync.syncNow': 'Sincronizar agora',
  'docsync.unlink': 'Desconectar',
  'docsync.syncEnabled': 'Sincronizar automaticamente',
  'docsync.direction': 'Direção',
  'docsync.directionBoth': 'Nos dois sentidos',
  'docsync.directionPull': 'Somente para o TREK',
  'docsync.directionPush': 'Somente para o provedor',
  'docsync.deletePolicy': 'Quando um documento é excluído',
  'docsync.deleteUnlink': 'Manter as duas cópias e desfazer o vínculo',
  'docsync.deleteTrash': 'Mover a outra cópia para a lixeira dela',
  'docsync.webhookHint':
    'Cole esta URL no seu provedor para que as mudanças cheguem na hora. Sem isso, o TREK verifica em intervalos.',

  // Campos do formulário de conexão. As chaves espelham a coluna `label` de
  // document_provider_fields, que guarda um sufixo de chave, não o texto.
  'docsync.providerUrl': 'Endereço',
  'docsync.providerApiToken': 'Token de API',
  'docsync.providerApiKey': 'Chave de API',
  'docsync.providerAppPassword': 'Senha de aplicativo',
  'docsync.providerAppToken': 'Token de aplicativo',
  'docsync.providerUsername': 'Nome de usuário',
  'docsync.providerPassword': 'Senha',
  'docsync.providerOrganization': 'ID da organização',
  'docsync.providerBasePath': 'Pasta base',
  'docsync.providerOTP': 'Código de dois fatores',
  'docsync.allowInsecureTls': 'Aceitar certificado autoassinado',

  'docsync.hintPaperlessToken': 'Crie um em Meu perfil no Paperless. Ele carrega todos os direitos daquela conta.',
  'docsync.hintPapraKey':
    'Crie uma em Chaves de API no Papra. As chaves do Papra sempre alcançam todas as organizações às quais você pertence.',
  'docsync.hintPapraOrg': 'O id org_… que aparece na barra de endereços do Papra.',
  'docsync.hintNextcloudLogin': 'Seu nome de login do Nextcloud, não seu endereço de e-mail.',
  'docsync.hintNextcloudAppPassword':
    'Configurações, Segurança, Criar nova senha de aplicativo. Nunca a senha da sua conta.',
  'docsync.hintOpenCloudToken': 'Criado em tokens de aplicativo no OpenCloud.',
  'docsync.hintBasePath': 'Onde o TREK procura as pastas das viagens. O padrão é /TREK.',
  'docsync.hintSynologyUrl': 'Inclua a porta, por exemplo https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'De preferência uma conta DSM dedicada com acesso apenas a esta pasta compartilhada.',
  'docsync.hintSynologyOtp': 'Necessário só uma vez, se a conta usa autenticação de dois fatores.',

  'docsync.linkState.never': 'Ainda não sincronizado',
  'docsync.linkState.ok': 'Em sincronia',
  'docsync.linkState.partial': 'Sincronizado em parte',
  'docsync.linkState.failed': 'Falhou',
  'docsync.linkState.needs_reauth': 'Entre novamente',
  'docsync.linkState.scope_lost': 'A pasta sumiu',
  'docsync.linkState.orphaned': 'O dono saiu da viagem',

  'docsync.state.pending': 'Aguardando',
  'docsync.state.synced': 'Sincronizado',
  'docsync.state.conflict': 'Conflito',
  'docsync.state.rejected_type': 'Tipo não permitido',
  'docsync.state.too_large': 'Grande demais',
  'docsync.state.error': 'Erro',
  'docsync.state.remote_missing': 'Não está no provedor',
  'docsync.state.local_deleted': 'Excluído no TREK',
  'docsync.state.scope_drift': 'Saiu da pasta',

  'docsync.conflict.title': 'As duas cópias mudaram',
  'docsync.conflict.keepTrek': 'Manter a versão do TREK',
  'docsync.conflict.keepProvider': 'Manter a versão do provedor',
  'docsync.conflict.keepBoth': 'Manter as duas',

  // Os motivos de falha viajam como códigos, nunca como texto do outro lado: um
  // provedor responde em inglês, ou com a página de login HTML de um proxy, e
  // nenhum dos dois cabe aqui.
  'docsync.error.unreachable': 'Não foi possível acessar o provedor.',
  'docsync.error.tls_untrusted':
    'O certificado foi recusado. Permita certificados autoassinados se você confia nesta instância.',
  'docsync.error.unauthorized': 'As credenciais foram recusadas.',
  'docsync.error.forbidden': 'Esta conta não tem permissão para fazer isso.',
  'docsync.error.not_found': 'Não encontrado no provedor.',
  'docsync.error.scope_missing': 'A pasta conectada não existe mais.',
  'docsync.error.rate_limited': 'O provedor está limitando o ritmo. O TREK vai tentar de novo mais tarde.',
  'docsync.error.too_large': 'O arquivo é maior do que o provedor aceita.',
  'docsync.error.unsupported_type': 'O provedor não aceita esse tipo de arquivo.',
  'docsync.error.quota_exceeded': 'O provedor está sem espaço.',
  'docsync.error.conflict': 'O documento mudou dos dois lados.',
  'docsync.error.checksum_mismatch': 'A transferência não chegou intacta.',
  'docsync.error.provider_error': 'O provedor relatou um erro.',
  'docsync.error.timeout': 'O provedor demorou demais para responder.',
  'docsync.error.ssrf_blocked': 'Esse endereço não é permitido.',
  'docsync.error.mass_delete_guard':
    'Quase todos os documentos sumiram de uma vez, então nada foi alterado. Verifique se a pasta ainda está montada.',
  'docsync.error.unknown': 'Algo deu errado.',
  'docsync.error.unknown_provider': 'Este provedor não está disponível nesta instância.',
};

export default docsync;
