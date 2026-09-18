import type { TranslationStrings } from '../types';

const docsync: TranslationStrings = {
  'docsync.title': 'Đồng bộ tài liệu',
  'docsync.subtitle': 'Giữ tài liệu của chuyến đi này khớp với kho tài liệu của riêng bạn.',
  'docsync.noProviders': 'Không có nhà cung cấp tài liệu nào khả dụng',
  'docsync.noProvidersHint': 'Quản trị viên hệ thống bật chúng trong Quản trị → Tiện ích bổ sung → Tài liệu.',
  'docsync.addProvider': 'Kết nối nhà cung cấp',
  'docsync.test': 'Kiểm tra kết nối',
  'docsync.connected': 'Đã kết nối',
  'docsync.chooseFolder': 'Chọn thư mục',
  'docsync.chooseFolderHint':
    'Chọn thư mục, thẻ hoặc không gian thuộc về chuyến đi này. Chỉ tài liệu bên trong mới được đồng bộ.',
  'docsync.noFolders': 'Chưa tìm thấy gì trên máy chủ này.',
  'docsync.newFolderPlaceholder': 'Tên thư mục mới',
  'docsync.createFolder': 'Tạo',
  'docsync.syncNow': 'Đồng bộ ngay',
  'docsync.unlink': 'Ngắt kết nối',
  'docsync.syncEnabled': 'Tự động đồng bộ',
  'docsync.direction': 'Hướng',
  'docsync.directionBoth': 'Cả hai chiều',
  'docsync.directionPull': 'Chỉ vào TREK',
  'docsync.directionPush': 'Chỉ ra nhà cung cấp',
  'docsync.deletePolicy': 'Khi một tài liệu bị xóa',
  'docsync.deleteUnlink': 'Giữ cả hai bản, bỏ ghép cặp',
  'docsync.deleteTrash': 'Chuyển bản còn lại vào thùng rác của nó',
  'docsync.webhookHint':
    'Dán URL này vào nhà cung cấp của bạn để thay đổi đến ngay lập tức. Nếu không, TREK sẽ kiểm tra theo định kỳ.',

  // Các trường của biểu mẫu kết nối. Khóa phản chiếu cột `label` trong
  // document_provider_fields, nơi lưu hậu tố khóa chứ không phải văn bản.
  'docsync.providerUrl': 'Địa chỉ',
  'docsync.providerApiToken': 'Mã thông báo API',
  'docsync.providerApiKey': 'Khóa API',
  'docsync.providerAppPassword': 'Mật khẩu ứng dụng',
  'docsync.providerAppToken': 'Mã thông báo ứng dụng',
  'docsync.providerUsername': 'Tên đăng nhập',
  'docsync.providerPassword': 'Mật khẩu',
  'docsync.providerOrganization': 'ID tổ chức',
  'docsync.providerBasePath': 'Thư mục gốc',
  'docsync.providerOTP': 'Mã xác thực hai yếu tố',
  'docsync.allowInsecureTls': 'Chấp nhận chứng chỉ tự ký',

  'docsync.hintPaperlessToken': 'Tạo trong Paperless ở mục Hồ sơ của tôi. Mã này mang toàn bộ quyền của tài khoản đó.',
  'docsync.hintPapraKey': 'Tạo trong Papra ở mục Khóa API. Khóa Papra luôn truy cập được mọi tổ chức mà bạn tham gia.',
  'docsync.hintPapraOrg': 'Mã org_… lấy từ thanh địa chỉ của Papra.',
  'docsync.hintNextcloudLogin': 'Tên đăng nhập Nextcloud của bạn, không phải địa chỉ email.',
  'docsync.hintNextcloudAppPassword':
    'Cài đặt → Bảo mật → Tạo mật khẩu ứng dụng mới. Không bao giờ dùng mật khẩu tài khoản.',
  'docsync.hintOpenCloudToken': 'Được tạo trong OpenCloud ở mục mã thông báo ứng dụng.',
  'docsync.hintBasePath': 'Nơi TREK tìm thư mục chuyến đi. Mặc định là /TREK.',
  'docsync.hintSynologyUrl': 'Nhớ kèm cổng, ví dụ https://nas.example.com:5001',
  'docsync.hintSynologyUser': 'Tốt nhất là một tài khoản DSM riêng chỉ truy cập được thư mục chia sẻ này.',
  'docsync.hintSynologyOtp': 'Chỉ cần một lần, nếu tài khoản dùng xác thực hai yếu tố.',

  'docsync.linkState.never': 'Chưa đồng bộ',
  'docsync.linkState.ok': 'Đã đồng bộ',
  'docsync.linkState.partial': 'Đồng bộ một phần',
  'docsync.linkState.failed': 'Thất bại',
  'docsync.linkState.needs_reauth': 'Đăng nhập lại',
  'docsync.linkState.scope_lost': 'Thư mục không còn',
  'docsync.linkState.orphaned': 'Chủ sở hữu đã rời chuyến đi',

  'docsync.state.pending': 'Đang chờ',
  'docsync.state.synced': 'Đã đồng bộ',
  'docsync.state.conflict': 'Xung đột',
  'docsync.state.rejected_type': 'Loại không được phép',
  'docsync.state.too_large': 'Quá lớn',
  'docsync.state.error': 'Lỗi',
  'docsync.state.remote_missing': 'Không có ở nhà cung cấp',
  'docsync.state.local_deleted': 'Đã xóa trong TREK',
  'docsync.state.scope_drift': 'Đã chuyển ra khỏi thư mục',

  'docsync.conflict.title': 'Cả hai bản đều thay đổi',
  'docsync.conflict.keepTrek': 'Giữ bản TREK',
  'docsync.conflict.keepProvider': 'Giữ bản của nhà cung cấp',
  'docsync.conflict.keepBoth': 'Giữ cả hai',

  // Lý do thất bại được truyền dưới dạng mã, không bao giờ là văn bản từ phía
  // nhà cung cấp: nhà cung cấp trả lời bằng tiếng Anh, hoặc bằng trang đăng nhập
  // HTML của proxy, và cả hai đều không thuộc về đây.
  'docsync.error.unreachable': 'Không thể kết nối tới nhà cung cấp.',
  'docsync.error.tls_untrusted': 'Chứng chỉ bị từ chối. Hãy cho phép chứng chỉ tự ký nếu bạn tin cậy máy chủ này.',
  'docsync.error.unauthorized': 'Thông tin đăng nhập bị từ chối.',
  'docsync.error.forbidden': 'Tài khoản này không được phép làm việc đó.',
  'docsync.error.not_found': 'Không tìm thấy ở nhà cung cấp.',
  'docsync.error.scope_missing': 'Thư mục đã kết nối không còn tồn tại.',
  'docsync.error.rate_limited': 'Nhà cung cấp đang giới hạn số lượt gọi của chúng ta. TREK sẽ thử lại sau.',
  'docsync.error.too_large': 'Tệp lớn hơn mức nhà cung cấp chấp nhận.',
  'docsync.error.unsupported_type': 'Nhà cung cấp không chấp nhận loại tệp này.',
  'docsync.error.quota_exceeded': 'Nhà cung cấp đã hết dung lượng.',
  'docsync.error.conflict': 'Tài liệu đã thay đổi ở cả hai bên.',
  'docsync.error.checksum_mismatch': 'Dữ liệu truyền đi không đến nơi nguyên vẹn.',
  'docsync.error.provider_error': 'Nhà cung cấp báo lỗi.',
  'docsync.error.timeout': 'Nhà cung cấp phản hồi quá lâu.',
  'docsync.error.ssrf_blocked': 'Địa chỉ đó không được phép.',
  'docsync.error.mass_delete_guard':
    'Phần lớn tài liệu biến mất cùng lúc, nên không có gì được thay đổi. Hãy kiểm tra xem thư mục còn được gắn kết không.',
  'docsync.error.unknown': 'Đã xảy ra lỗi.',
  'docsync.error.unknown_provider': 'Nhà cung cấp này không khả dụng trên máy chủ này.',
};

export default docsync;
