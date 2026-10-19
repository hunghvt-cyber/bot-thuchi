# Model chat Homepage

Chỉ sửa GAS bridge được giữ tại `main`, không sửa GAS webhook hiện hành.
Workflow triển khai: `.github/workflows/deploy-apps-script.yml` (manual, main).
Không bootstrap, không thay trigger, Telegram webhook, khóa hay Sheets.

`homepage_chat` nhận `operation:models` để đọc danh sách bằng khóa Gemini hiện có
(HMAC và timestamp như chat). Lọc `generateContent` và allowlist: model mặc định
`GEMINI_SHARED_MODEL` hiện có, 3.5/3.1/2.5 Flash-Lite. Google liệt kê model không
chứng minh khóa còn quota hoặc đang Free Tier. Cache 300 giây, `refresh:true`
bỏ qua cache. Không tạo generation khi tải danh sách, không đổi quota chat 30/ngày.

Chat nhận `model` tùy chọn; model được chọn phải trong allowlist và danh sách
Google. Bỏ trống giữ mặc định cũ. Lựa chọn không ghi Script Properties và không
thay đổi model receipt/parser/bot. Không retry hoặc fallback model.

`sharedGeminiResult_` trả text/requestedModel/modelVersion. `modelVersion` lấy từ
Google, thiếu thì null, không đoán từ text. `sharedGemini_` giữ nguyên giao diện
trả chuỗi cho quét bill. Response thành công của `homepage_chat` có metadata;
không trả key, Google response nguyên bản, lịch sử hoặc private URL.

Triển khai bridge trước Homepage UI/API. Tests local mô phỏng Google, không phải
bằng chứng live. Sau khi workflow main thành công, cần smoke bằng phiên Homepage
thật. Hướng dẫn chi tiết ở Homepage-nas/docs/GEMINI-MODELS-20261019.md.
