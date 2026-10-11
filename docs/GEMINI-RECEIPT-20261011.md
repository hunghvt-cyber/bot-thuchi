# Gemini chat và scan bill

Dùng lại `GEMINI_API_KEY`; tính năng mới dùng `GEMINI_SHARED_MODEL` (mặc định `gemini-3.5-flash-lite`, có Free Tier theo Google) trong Script Properties, không Gemini CLI, không NAS, không tạo khóa mới hoặc bật billing.

## Scan bill

Gửi một ảnh hóa đơn vào nhóm gia đình đã bind. Hỗ trợ Telegram Photo và file JPEG/PNG/WebP tối đa 4 MB; PDF và loại khác bị từ chối. Gemini đọc tổng cần thanh toán sau giảm giá, không lấy tiền khách đưa hoặc tiền thừa. Không rõ tổng, không phải hóa đơn, không phải VND, JSON sai hoặc phản hồi bị cắt: không ghi.

Bot tạo bản nháp gồm tổng tiền, danh mục, mô tả và ngày đọc trên bill. Chỉ người gửi ảnh được xác nhận/hủy hoặc Reply `sửa tiền 85k`. Bản nháp hết hạn trong 10 phút, lưu cache tạm; cache có thể bị thu hồi sớm, khi đó gửi lại ảnh. Ảnh không được lưu Drive hoặc Sheets bởi tính năng này; được gửi tới Telegram/Google để xử lý. Nội dung, ngày và tổng có thể được đọc sai: người dùng kiểm tra trước khi xác nhận.

Một bill ghi một giao dịch tổng, không tách từng món. Ngày chi tiêu là hôm nay khi xác nhận, giữ cách ghi hiện tại; ngày trên bill chỉ là thông tin để kiểm tra. Bill cùng message ID không ghi hai lần kể cả bấm xác nhận lặp; gửi lại cùng ảnh thành message khác là một yêu cầu mới. Tin xác nhận có mã và liên kết reply để sửa/xóa như trước.

Receipt chỉ nhận từ polling Telegram đã xác thực bằng bot token. Endpoint `doPost` không nhận receipt callback; không tạo webhook hoặc trigger. Giữ khóa polling trong suốt xử lý, quota helper không tự giải phóng khóa của caller. Tối đa 20 lần gọi scan/ngày, 30 lần gọi chat/ngày; không tự retry/fallback model.

## Homepage chat

`homepage_chat` chỉ chấp nhận HMAC ký bằng `HOMEPAGE_STATS_SECRET`, payload chứa action, lịch sử và timestamp tối đa 60 giây. Auth sai không gọi Gemini hoặc đọc ledger. Chat không ghi Sheets và không gửi Telegram. Homepage dùng phiên mật khẩu và `EXPENSES_API_URL/SECRET` đang có.

## Giới hạn phí và triển khai

Không bật thanh toán. Billing tier Google chưa được xác minh; code dùng khóa đang có, không tự bảo đảm miễn phí nếu project đó đã bật paid tier. Trần request giúp bảo vệ quota, không phải trần tiền. Home-AI vẫn dùng khóa riêng của nó, không sao chép key giữa dự án.

Workflow deploy production chạy kiểm thử rồi clasp push/update deployment hiện có; không setup/bootstrap, không đổi polling/offset/Script Properties. Trước đây workflow chỉ dispatch sau thí nghiệm webhook đã đóng; trigger push cho các file source/test chỉ deploy với marker `[deploy-gemini]` trong commit; dispatch vẫn dùng như trước. Rollback bằng revert rồi deploy workflow. Không xóa ledger.

Kiểm thử: `node --test tests/*.test.js`, `node tests/test-money-parser.js`, parse tất cả `.gs` bằng Node VM. Test giả lập các dịch vụ Google/Telegram; cần thử ảnh bill thực trên nhóm sau deploy để xác nhận model/khóa/quota.
