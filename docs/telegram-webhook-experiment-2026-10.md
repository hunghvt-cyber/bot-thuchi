# Quyết định kỹ thuật: Telegram webhook trực tiếp tới Apps Script

> **ĐÍNH CHÍNH 16/10/2026:** Đây là kết quả của bot/deployment thử nghiệm cũ, không phải kết luận về bot hiện hành `@PoormanTest0219_bot`. Theo hồ sơ bàn giao và xác nhận người vận hành, bot hiện tại sử dụng webhook `doPost(e)`, bot polling cũ đã ngừng. Không dùng tài liệu này để khôi phục polling hoặc thay đổi webhook production; cần đối chiếu runtime trước khi thao tác.


Trạng thái: **Đóng thử nghiệm ngày 2026-10-08. Không lặp lại phép thử này nếu không có bằng chứng kỹ thuật mới.**

## Kết luận vận hành

Bot chi tiêu gia đình **tiếp tục dùng polling**: Apps Script trigger chạy khoảng mỗi phút, gọi Telegram `getUpdates`. Không chuyển bot chính sang webhook; không thêm Cloudflare/VPS hay dịch vụ trung gian.

Không khẳng định rằng webhook trực tiếp từ Telegram tới mọi Apps Script là bất khả thi. Đây là kết quả của **thử nghiệm cụ thể** trên dự án và deployment dưới đây. Một bot cũ từng phản hồi nhanh qua `doPost(e)`, nhưng chưa xác định được sự khác biệt về deployment, quyền truy cập hay đường đi yêu cầu.

## Phép thử đã thực hiện

- Dự án GAS thử nghiệm riêng: `1bZPB4JI11VRZJA1aoGkNZ2JOo4_hWXlqsenGd6902yOikX_oKG74jPoP`; token bot thử nghiệm nằm trong Script Property `TEST_BOT_TOKEN`.
- Web App công khai cuối cùng: `https://script.google.com/macros/s/AKfycbyz9lklOUobi-ghu4ZmRhFXJuI5GiHKfaCTb5Ss88GMigeMqxkhvixyKY4HtPcA-C-d/exec`.
- Ban đầu dùng `ContentService.createTextOutput('OK')`, sau đổi `HtmlService.createHtmlOutput('OK')`.
- URL ban đầu không truy cập ẩn danh được: GET/POST từ GitHub Actions nhận HTTP 404. Sau khi sửa deployment, truy cập ẩn danh được.
- GitHub Actions [run 37736259042](https://github.com/hunghvt-cyber/poorman-telebot/actions/runs/37736259042): GET /exec = **302**, POST /exec = **302**, `curl -L -X POST` = **405** sau một redirect. Lưu ý 405 có thể do `-X POST` ép phương thức sau redirect, không phải bằng chứng riêng về webhook.
- Telegram `setWebhook` chấp nhận URL nhưng `getWebhookInfo` báo `Wrong response from the webhook: 404 Not Found`; `pending_update_count` tăng từ 2 lên 5. Người dùng gửi `/ping` không thấy phản hồi.
- Apps Script Executions không hiển thị `doPost` tại các thời điểm kiểm tra.
- Đổi sang `HtmlService` và thêm log/chống lặp `update_id` cũng không giúp webhook hoạt động trong lần thử này.

**Diễn giải:** Đã quan sát sự không tương thích HTTP/đường truy cập giữa Telegram và Web App thử nghiệm. Chưa chứng minh nguyên nhân chính xác của 404 từ Telegram, và không nên kết luận mọi Apps Script `doPost` đều thất bại.

## Dọn dẹp

- Xóa các workflow thử nghiệm khỏi nhánh `main`: `diagnose-test-webapp.yml`, `test-direct-webhook.yml`.
- Không nhập thử nghiệm vào code bot chính.
- Nhánh lịch sử `experiment/direct-dopost-webhook` có thể còn trên GitHub, không được workflow của nhánh `main` triển khai.
- **Việc cần làm thủ công:** Trong GAS thử nghiệm, chạy `removeTestWebhook()` để gọi Telegram `deleteWebhook` bằng token lưu trong Script Properties; kiểm tra lại `checkTestWebhook()` thấy `url` rỗng. Có thể xóa bot thử nghiệm qua BotFather và xóa dự án GAS thử nghiệm sau khi xác nhận không còn cần dùng. Không xóa bot/dự án chính.

## Điều kiện mở lại

Chỉ mở lại nếu có phương án có thể kiểm chứng nhận được HTTP 2xx trực tiếp từ Telegram hoặc tìm ra khác biệt cấu hình của bot `doPost` cũ. Mọi thử nghiệm phải dùng bot/GAS riêng, không ảnh hưởng hệ thống chi tiêu đang chạy.
