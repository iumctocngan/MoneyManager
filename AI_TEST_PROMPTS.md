# Bộ Test Prompt cho AI Assistant (MoneyManager)

Tài liệu này chứa các mẫu câu hỏi dùng để kiểm tra năng lực của AI Agent sau khi đã được nâng cấp. Các mẫu câu này phủ đủ 5 trụ cột: **Thống kê, Phân tích, Đánh giá, Dự báo, và Gợi ý**.

---

## 📊 1. Thống kê (Statistics)
*Mục tiêu: Kiểm tra tool `get_financial_status` lấy số liệu thô.*

- `Tháng này tôi đã chi bao nhiêu?`
- `Số dư hiện tại của tôi là bao nhiêu?`
- `Tháng này tôi thu chi thế nào? Tóm tắt nhanh cho tôi.`
- `Tôi đã chi nhiều nhất vào danh mục nào tháng này?`

---

## 🔍 2. Phân tích (Analysis)
*Mục tiêu: Kiểm tra khả năng bóc tách dữ liệu từ snapshot.*

- `Phân tích chi tiêu tháng này của tôi, tôi đang chi nhiều vào đâu nhất?`
- `So sánh thu nhập và chi tiêu tháng này, tôi có đang tiết kiệm được không?`
- `Ngân sách của tôi đang ở mức nào, cái nào gần vượt?`

---

## ⚖️ 3. Đánh giá (Evaluation)
*Mục tiêu: Kiểm tra khả năng so sánh với Budget và dữ liệu quá khứ (Trend).*

- `Tôi có đang chi tiêu hợp lý không? Đánh giá tổng thể tình hình tài chính của tôi.`
- `Chi tiêu ăn uống của tôi tháng này có cao không so với các tháng trước?`
- `3 tháng gần nhất tôi có đang tiết kiệm được không?`

---

## 📈 4. Dự báo (Forecasting)
*Mục tiêu: Kiểm tra logic Burn rate và dự đoán cuối tháng.*

- `Cuối tháng này tôi sẽ chi khoảng bao nhiêu?`
- `Với tốc độ chi tiêu hiện tại, tôi có vượt ngân sách không?`
- `Tháng này tôi còn bao nhiêu ngày nữa và nên chi tối đa bao nhiêu mỗi ngày?`

---

## 💡 5. Gợi ý (Suggestions)
*Mục tiêu: Kiểm tra khả năng tư vấn tài chính cá nhân dựa trên data thực tế.*

- `Tôi nên cắt giảm khoản nào để tiết kiệm hơn?`
- `Cho tôi 3 gợi ý cụ thể để cải thiện tài chính tháng sau.`
- `Dựa vào lịch sử 3 tháng, tôi nên đặt ngân sách ăn uống bao nhiêu là hợp lý?`

---

## 🔴 6. Trường hợp đặc biệt (Edge Cases)
*Mục tiêu: Kiểm tra tính ổn định và xử lý ngày tháng.*

- `Thêm cho tôi khoản chi 50k ăn sáng hôm nay` (Kiểm tra tool `add_transaction`)
- `Tháng 2 năm nay tôi chi bao nhiêu?` (Kiểm tra query tháng cũ)
- `So sánh tháng này với tháng trước, tháng nào tôi chi nhiều hơn?`
- `Tôi có bao nhiêu ví, số dư mỗi ví là bao nhiêu?`

---

## 🧪 7. Kiểm tra hiệu năng (Stress Test)
*Mục tiêu: Kiểm tra quy tắc "gọi ít tool nhất có thể" để đảm bảo tốc độ phản hồi < 5s.*

- `Phân tích chi tiêu tháng này và dự báo cuối tháng luôn giúp tôi` 
  - *Kỳ vọng: Chỉ gọi 1 tool `get_financial_status` duy nhất.*
- `Đánh giá tổng thể 3 tháng gần nhất và gợi ý tôi nên làm gì`
  - *Kỳ vọng: Chỉ gọi 1 tool `get_trend_report` với tham số `months: 3`.*

> [!IMPORTANT]
> **Lưu ý quan trọng:** Nếu AI gọi quá 2 tool cho cùng một câu hỏi đơn giản, hoặc trả lời lâu quá 10 giây, cần xem lại phần mô tả (description) của tool trong `aiAgent.js`.
