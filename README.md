# Poorman Telebot — chi tiêu gia đình

Telegram → Google Apps Script → Google Sheets; parser local trước, Gemini khi cần.
Nguồn gốc: [nmloc/ledger-bot-telegram](https://github.com/nmloc/ledger-bot-telegram) (MIT).

## Hai nguồn có trách nhiệm khác nhau

| Thành phần | Nguồn sửa đúng | Triển khai |
| --- | --- | --- |
| Bot gia đình webhook doPost, @PoormanTest0219_bot | [experiment/gas-webhook-isolated:experiments/gas-webhook](https://github.com/hunghvt-cyber/poorman-telebot/tree/experiment/gas-webhook-isolated/experiments/gas-webhook) | Workflow deploy-gas-webhook-test, push chỉ khi thay trong thư mục webhook trên nhánh đó; có manual dispatch |
| Bridge Homepage chi tiêu/Gemini | root main | deploy-apps-script chỉ manual dispatch; không bootstrap |
| Bot polling root cũ | mã lịch sử trên main | Không bật lại |

Đã đối chiếu workflow của main và nhánh webhook, manifest GAS timezone
Asia/Ho_Chi_Minh ngày 22/10/2026. Việc dùng webhook được ghi trong
[hồ sơ bot](https://github.com/hunghvt-cyber/poorman-telebot/blob/experiment/gas-webhook-isolated/experiments/gas-webhook/PROJECT_CONTEXT.md).
**Chưa xác minh trực tiếp Telegram getWebhookInfo, GAS revision và group binding
trong đợt này.** Workflow deploy thành công không chứng minh mọi handler hoặc trigger
đang chạy đúng. Không suy nhánh production từ tên experiment/test.

## Sử dụng và tiếp quản

- Ghi chi tự nhiên, ví dụ `cafe 35k`; xem lệnh hiện hành trong source webhook.
- Đọc PROJECT_CONTEXT trên nhánh webhook trước sửa bot; phần nhật ký cũ không phải
  checklist cutover mới. Chỉ một bot ghi giao dịch vào nhóm.
- Homepage đọc bridge riêng bằng HMAC; không deploy bridge vào GAS bot hoặc ngược lại.
- Khóa ở GAS Script Properties/GitHub Secrets phù hợp; chỉ ghi tên/vị trí, không lấy giá trị.

## Giới hạn và kiểm tra

Không chạy `setupFamilyBot()`, bật `pollFamilyTelegram_`, thay webhook hoặc trigger,
reset ledger hay migration từ một đợt sửa tài liệu. Không gộp toàn bộ nhánh webhook
vào main để làm đẹp cấu trúc.

Kiểm tra bridge: `node tests/test-money-parser.js`, `node --test tests/*.test.js`.
Kiểm tra bot: đọc bộ tests và workflow ở nhánh webhook; không coi mock test là
xác nhận Sheets/Telegram thật. Phân biệt committed, deployed, executed và verified.

## Tài liệu chuyên trách

- [Chat nội dung dài](docs/HOMEPAGE-LONG-CHAT-20261020.md), [model](docs/HOMEPAGE-MODELS-20261019.md).
- [Receipt 11/10](docs/GEMINI-RECEIPT-20261011.md): hồ sơ có thời điểm; xác minh đúng nhánh/deployment trước áp dụng.
- [Thử webhook cũ](docs/telegram-webhook-experiment-2026-10.md): kết luận cũ không phủ định bot webhook hiện hành.
- [README trước chuẩn hóa](docs/archive/README-before-20261022.md): giữ chi tiết polling/cài đặt và lịch sử để tra cứu, không làm theo trên bot đang dùng.
- [Bản đồ chung](https://github.com/hunghvt-cyber/0219nas-aio).
