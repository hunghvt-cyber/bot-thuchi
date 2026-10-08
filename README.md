# Poorman Telebot — Family Expense Bot

Bot ghi chi tiêu gia đình trong Telegram group. Backend chạy miễn phí bằng Google Apps Script, dữ liệu ở Google Sheets, Gemini chỉ dùng khi parser local không hiểu.

Based on [nmloc/ledger-bot-telegram](https://github.com/nmloc/ledger-bot-telegram) (MIT).

## V1

- Group Telegram dùng chung cho gia đình.
- Tự nhận diện người chi từ Telegram user ID/name.
- Nhắn tự nhiên: `cafe 35k`, `đi chợ 420k`, `tiền điện 1tr`.
- Parser local xử lý câu đơn giản, không tốn Gemini quota.
- Gemini xử lý câu khó.
- Một sheet `Transactions` chung.
- `/today`: chi hôm nay; `/month`: chi tháng này; `/mine`: riêng người gửi; `/whoami`: lấy User/Group ID.
- Gmail/MacroDroid bank ingestion giữ cho V2.

## Cài đặt

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
8. Chạy hàm `setupFamilyBot()` một lần và cấp quyền.
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

Thử nghiệm webhook trực tiếp tới Google Apps Script đã đóng; bot chính tiếp tục dùng polling. Xem [kết quả thử nghiệm và lý do không thử lại](docs/telegram-webhook-experiment-2026-10.md).
