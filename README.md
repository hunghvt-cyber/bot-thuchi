# Poorman Telebot — Family Expense Bot

> [!IMPORTANT]
> **TRẠNG THÁI HIỆN TẠI — 2026-10-16:** Bot chi tiêu gia đình đang dùng **@PoormanTest0219_bot** qua Telegram webhook, **KHÔNG phải** bot polling trong mã nguồn gốc của nhánh `main`.
>
> **Nguồn sự thật để phát triển bot:** nhánh [`experiment/gas-webhook-isolated`](https://github.com/hunghvt-cyber/poorman-telebot/tree/experiment/gas-webhook-isolated), thư mục [`experiments/gas-webhook/`](https://github.com/hunghvt-cyber/poorman-telebot/tree/experiment/gas-webhook-isolated/experiments/gas-webhook), đặc biệt [`PROJECT_CONTEXT.md`](https://github.com/hunghvt-cyber/poorman-telebot/blob/experiment/gas-webhook-isolated/experiments/gas-webhook/PROJECT_CONTEXT.md).
>
> **ĐỪNG** sửa root `FamilyLedger.gs` / `FamilyRouter.gs` trên `main` để thay đổi bot đang hoạt động. **ĐỪNG** chạy `setupFamilyBot()`, bật lại `pollFamilyTelegram_`, hoặc gộp toàn bộ nhánh webhook vào `main` mà không có kế hoạch chuyển đổi. GAS cũ vẫn được giữ cho các endpoint Homepage và phương án dự phòng. Các phần dưới đây chủ yếu mô tả kiến trúc **legacy**.
>
> Quy trình cập nhật bot hiện tại: sửa mã ở `experiment/gas-webhook-isolated:experiments/gas-webhook/` → workflow `deploy-gas-webhook-test.yml` chạy khi push vào thư mục này → triển khai tới GAS webhook riêng. **Deploy mã không đồng nghĩa chạy hàm GAS một lần**. Thay đổi dữ liệu Google Sheets phải được thực thi và xác nhận riêng.


Bot ghi chi tiêu gia đình trong Telegram group. Backend chạy miễn phí bằng Google Apps Script, dữ liệu ở Google Sheets, Gemini chỉ dùng khi parser local không hiểu.

Based on [nmloc/ledger-bot-telegram](https://github.com/nmloc/ledger-bot-telegram) (MIT).

## Lưu ý vận hành bot hiện tại (16/10/2026)

- Người vận hành xác nhận bot đang sử dụng là `@PoormanTest0219_bot`, theo cơ chế Telegram webhook / Apps Script `doPost(e)`. Bot polling cũ đã bỏ.
- Mã nguồn vẫn có `pollFamilyTelegram_()` và `setupFamilyBot()` của hệ thống cũ. **Không chạy `setupFamilyBot()`, `setWebhook()`, `deleteWebhook()` hoặc tạo lại polling trigger** khi chưa xác minh đúng bot và deployment.
- Các ghi chú polling trong README, workflow và tài liệu quét hóa đơn 11/10 là lịch sử cấu hình cũ, **không phải bằng chứng trạng thái production hiện tại**.
- Chưa đối chiếu độc lập `getWebhookInfo` với Apps Script deployment hiện tại. Trước khi sửa bot, xác minh bot username, URL webhook, Apps Script project/deployment và group đích; không thay đổi production chỉ dựa vào tài liệu.

## V1

- Group Telegram dùng chung cho gia đình.
- Tự nhận diện người chi từ Telegram user ID/name.
- Nhắn tự nhiên: `cafe 35k`, `đi chợ 420k`, `tiền điện 1tr`.
- Parser local xử lý câu đơn giản, không tốn Gemini quota.
- Gemini xử lý câu khó.
- Một sheet `Transactions` chung.
- `/today`: chi hôm nay; `/month`: chi tháng này; `/mine`: riêng người gửi; `/whoami`: lấy User/Group ID.
- Gmail/MacroDroid bank ingestion giữ cho V2.

## Cài đặt bot polling cũ — LƯU TRỮ, KHÔNG THỰC HIỆN

> Các bước bên dưới chỉ để tham khảo lịch sử. Bot hiện hành phải theo `experiment/gas-webhook-isolated/experiments/gas-webhook/PROJECT_CONTEXT.md`.


1. Tạo Telegram bot bằng BotFather. Trong BotFather, tắt Privacy Mode cho bot nếu muốn bot đọc các tin nhắn thường trong group.
2. Tạo một Google Sheet trống và lấy Spreadsheet ID từ URL.
3. Tạo Google Apps Script project.
4. Đưa source repo này vào Apps Script bằng `clasp` hoặc copy lần đầu.
5. Project Settings → Script Properties, tạo:
   - `BOT_TOKEN`
   - `GEMINI_API_KEY`
   - `GOOGLE_SPREADSHEET_ID`
   - `GEMINI_MODEL` (optional, mặc định `gemini-2.5-flash`)
6. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
7. Copy URL `/exec`, thêm Script Property `WEB_APP_URL`.
8. **KHÔNG CHẠY TRÊN BOT HIỆN HÀNH:** `setupFamilyBot()` là bootstrap của bot polling cũ, có thao tác `deleteWebhook`.
9. Thêm bot vào private group, gửi `/whoami`. Sau đó nên đặt `FAMILY_GROUP_ID` bằng Group ID nhận được để khóa bot vào đúng group.

## Test

Gửi trong group:

```
cafe 35k
đi chợ 420k
tiền điện 1tr
```

Sau đó thử `/today`, `/month`, `/mine`.

## Bảo mật

Không commit token/API key. Tất cả secret nằm trong Apps Script Script Properties. Nên đặt `FAMILY_GROUP_ID` sau lần test đầu.

## Roadmap

V1: Telegram family ledger. V2: Gmail bank alerts + MacroDroid webhook, dedupe nguồn giao dịch, sửa/xóa bằng reply, báo cáo nâng cao.

## Ghi chú kỹ thuật về Telegram webhook

Thử nghiệm webhook **cũ** đã đóng; kết luận đó không áp dụng cho bot webhook đang dùng. Xem [nhật ký lịch sử](docs/telegram-webhook-experiment-2026-10.md) và [hồ sơ bàn giao hiện hành](https://github.com/hunghvt-cyber/poorman-telebot/blob/experiment/gas-webhook-isolated/experiments/gas-webhook/PROJECT_CONTEXT.md).

## Xóa mềm giao dịch thử nghiệm và tra mã

- Quản trị viên nhóm gửi `/resettests`. Bot hiển thị nút **Xác nhận xóa mềm** / **Hủy**; chỉ người đã yêu cầu được bấm xác nhận, trong 5 phút. Không cần gõ `/resettests XACNHAN` nữa.
- Bot đánh dấu `DELETED` cho các giao dịch của nhóm đã tồn tại tại thời điểm yêu cầu, ghi `AuditLog`, không xóa hàng trong Sheets. Giao dịch mới phát sinh sau khi yêu cầu không bị ảnh hưởng.
- Mã giao dịch dạng `#xxxxxxxx` xuất hiện trong tin xác nhận ghi chi tiêu và lệnh `/giaodich`. Dùng `/xoa #mã`, `/khoiphuc #mã`, `/suatien #mã 15k` để thao tác.
- **Chỉ thuộc bot cũ:** cơ chế polling nhận `message` và `callback_query`. Bot hiện hành nhận các cập nhật qua webhook riêng.

## Báo cáo trên Homepage

API `homepage_stats` đọc toàn bộ giao dịch trong Google Sheets theo tháng, bao gồm nhóm Telegram cũ và mới; loại giao dịch `DELETED`. Ngày và tháng lấy từ cột `Date` (ngày lịch theo múi giờ của spreadsheet với ô ngày native, hoặc chuỗi dd/MM/yyyy / yyyy-MM-dd), không lấy từ `Timestamp`. Ngày trống hoặc không hợp lệ bị loại; không tự suy đoán từ timestamp. Chỉ trả ngày, số tiền, loại giao dịch, danh mục và người chi. Không ghi Sheets, không tạo sheet, không gửi Telegram và không thay đổi trigger.

- Apps Script Script Properties: `HOMEPAGE_STATS_SECRET`, khóa ngẫu nhiên riêng ít nhất 32 ký tự.
- Homepage Vercel Production: `EXPENSES_API_SECRET` giống khóa trên; `EXPENSES_API_URL` là URL `/exec` của deployment chính.
- Deploy source mới vào deployment Web app hiện có, giữ nguyên quyền truy cập và URL. Không chạy `setupFamilyBot()` hoặc bootstrap.
- Redeploy Homepage để nhận cấu hình. Trang `/chi-tieu/` dùng cùng phiên mở khóa với Notes/QR.

Khóa không nằm trong repo, HTML, chat hoặc log. Request từ Homepage được ký HMAC SHA-256 và có thời hạn 60 giây. Endpoint không đọc dữ liệu khi xác thực sai. Kiểm tra: `node tests/test-money-parser.js` và `node --test tests/homepage-stats.test.js`.



## Scan bill và chat Homepage

Gửi ảnh bill vào nhóm, kiểm tra tổng rồi bấm **Ghi chi tiêu**. Reply bản nháp `sửa tiền 85k` nếu cần. Một bill ghi một khoản tổng vào hôm nay, chỉ người gửi được xác nhận. [Cấu hình, giới hạn và triển khai](docs/GEMINI-RECEIPT-20261011.md). Khóa/model Gemini hiện có được dùng lại; không bật billing. Workflow chỉ deploy khi dispatch hoặc commit có `[deploy-gemini]`.
