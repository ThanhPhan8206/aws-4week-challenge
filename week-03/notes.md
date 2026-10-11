# Phần 1: Lý thuyết & Kiến thức Vận hành

### 1. Phân biệt Metrics & Logs

| Tiêu chí | Metrics (Chỉ số) | Logs (Nhật ký hành vi) |
| :--- | :--- | :--- |
| **Định nghĩa** | Là các dữ liệu số đo lường hiệu năng hệ thống theo thời gian (Time-series data). | Là các bản ghi text ghi lại các sự kiện cụ thể xảy ra trong hệ thống tại một thời điểm. |
| **Điểm cốt lõi** | Mang tính **định lượng** (Hệ thống đang chạy nhanh/chậm ra sao, tốn bao nhiêu tài nguyên?). | Mang tính **định tính** (Hệ thống đã xảy ra lỗi gì, tại sao lỗi, ai đã gọi API?). |
| **Dung lượng & Chi phí** | Nhẹ, dễ lưu trữ dài hạn, chi phí rẻ. | Rất lớn, tăng nhanh theo lưu lượng traffic, chi phí lưu trữ lớn. |
| **Vai trò trong Observability** | Giúp phát hiện bất thường nhanh chóng (Detection) và kích hoạt cảnh báo tự động (Alarming). | Giúp điều tra tận gốc nguyên nhân gây ra lỗi (Root Cause Analysis - Debugging). |

### 2. Cơ chế hoạt động của CloudWatch Agent

CloudWatch Agent là một phần mềm độc lập được cài đặt bên trong hệ điều hành của EC2 (Guest OS). Cơ chế hoạt động bao gồm:

* **Thu thập (Collection):** Agent chạy ngầm (daemon/service), định kỳ đọc các file cấu hình hệ thống (`/proc` trên Linux hoặc Performance Counters trên Windows) để lấy **System Metrics** chuyên sâu (RAM, Disk space, Swap - những thông số mà bản thân AWS Hypervisor bên ngoài không thấy được). Đồng thời, nó giám sát (tail) các đường dẫn file log được chỉ định sẵn (ví dụ: `/var/log/nginx/access.log`).
* **Đóng gói & Đệm (Buffering):** Dữ liệu thu thập được gom lại (batching) và mã hóa để tối ưu hóa số lượng request gửi đi.
* **Đẩy dữ liệu (Pushing):** Agent sử dụng AWS SDK thông qua quyền IAM Role của EC2 để gọi API `PutMetricData` và `PutLogEvents` đẩy dữ liệu về dịch vụ AWS CloudWatch tập trung.

### 3. Quy trình Cảnh báo (Alerting Workflow)

Sơ đồ luồng sự kiện:
`[EC2 Instance] --(Metrics/Logs)--> [CloudWatch Metric] --(Vượt ngưỡng)--> [CloudWatch Alarm] --> [Amazon SNS Topic] --> [Email Notification]`

* **Bước 1 (EC2 Metric):** EC2 sinh dữ liệu (Ví dụ: `CPUUtilization` đạt 85%).
* **Bước 2 (CloudWatch Alarm):** Alarm liên tục kiểm tra Metric dựa trên điều kiện cấu hình (Ví dụ: `CPU > 80%` trong 5 phút). Nếu thỏa mãn, trạng thái chuyển từ `OK` sang `ALARM`.
* **Bước 3 (Amazon SNS Topic):** Khi trạng thái là `ALARM`, nó kích hoạt một Action gửi thông báo tới một SNS Topic (Publish message).
* **Bước 4 (Email Notification):** SNS Topic kiểm tra danh sách Subscriber (các Email đã confirm) và tự động gửi Email cảnh báo đến người vận hành.

### 4. Kiểm soát Chi phí (Cost Control) với AWS Budgets

Để phòng ngừa phát sinh chi phí ngoài ý muốn, cần thiết lập AWS Budgets theo các bước:

* **Tạo Budget:** Thiết lập ngân sách cố định hàng tháng (ví dụ: $10/tháng).
* **Cấu hình Ngưỡng Cảnh báo (Thresholds):** 
  * Cảnh báo theo **Actual (Thực tế)**: Gửi mail khi chi phí thực tế chạm 80% ngân sách.
  * Cảnh báo theo **Forecasted (Dự báo)**: Gửi mail ngay khi AWS dự báo chi phí cuối tháng có khả năng vượt 100% ngân sách.
* **Hành động Ngăn chặn nâng cao (Actions):** Có thể cấu hình AWS Budgets tự động gắn Policy giới hạn quyền hoặc tắt bớt tài nguyên thử nghiệm nếu chi phí vượt ngưỡng nghiêm trọng.
