# Phần 2: Đăng ký Ý tưởng Sản phẩm (Web Development)

## 1. Tên dự án & Mục tiêu ứng dụng
* **Tên dự án:** EduTest - Hệ thống thi thử trực tuyến TSA & HSA dành cho học sinh.
* **Mục tiêu ứng dụng:** 
  * Cung cấp nền tảng giả lập phòng thi thực tế cho hai kỳ thi Đánh giá tư duy (TSA) và Đánh giá năng lực (HSA).
  * Hỗ trợ học sinh làm bài thi trắc nghiệm đa dạng hình thức (chọn đáp án, điền số, kéo thả) có đếm ngược thời gian.
  * Tự động chấm điểm, lưu trữ lịch sử làm bài và cung cấp thống kê trực quan về tiến độ học tập của từng học viên.
  * Giúp giáo viên quản lý danh sách lớp học, thêm học viên và tự biên soạn, tải lên các bộ đề thi riêng biệt.

## 2. Công nghệ sử dụng
* **Frontend:** HTML, CSS, JavaScript (Giao diện hiển thị đồng hồ đếm ngược, bảng câu hỏi và bảng điều khiển trực quan).
* **Backend:** Node.js (Express framework) xử lý logic chấm điểm, quản lý phiên thi (session), bảo mật chống gian lận và quản lý tài khoản.
* **Database:** SQL Server (Lưu trữ thông tin học sinh, cấu trúc ngân hàng câu hỏi, ma trận đề thi và bảng điểm chi tiết).

## 3. Mô tả cách ứng dụng tương tác với hạ tầng VPC đã thiết kế ở Phần 1
Ứng dụng sẽ được triển khai theo mô hình 3 tầng (3-Tier Architecture) để tận dụng tối đa khả năng bảo mật và tính sẵn sàng cao (High Availability) của hạ tầng VPC:

* **Tầng Giao diện công cộng (Public Layer):** 
  * Một Application Load Balancer (ALB) sẽ được đặt tại các **Public Subnet** trải dài trên cả 2 Availability Zones (AZs) để tiếp nhận toàn bộ traffic (HTTP/HTTPS) từ học sinh truy cập qua Internet.
  * ALB làm nhiệm vụ phân phối tải và điều hướng dữ liệu một cách thông minh xuống tầng ứng dụng phía dưới.
* **Tầng Xử lý ứng dụng (Application Layer):**
  * Mã nguồn Backend Node.js sẽ được triển khai trên các máy chủ EC2 đặt hoàn toàn bên trong các **Private Subnet** của cả 2 AZs nhằm bảo vệ logic chấm điểm và mã nguồn khỏi sự tiếp cận trực tiếp từ Internet.
  * Các máy chủ này khi cần cập nhật thư viện phần mềm hoặc kết nối với API bên ngoài sẽ giao tiếp qua **NAT Gateway** ở chiều đi ra (Outbound).
* **Tầng Dữ liệu lõi (Database Layer):**
  * Hệ quản trị cơ sở dữ liệu SQL Server chứa thông tin tài khoản và ngân hàng đề thi sẽ được cô lập tuyệt đối ở tầng sâu nhất trong các **Private Subnet**.
  * Cấu hình Security Group chỉ cho phép duy nhất các máy chủ Node.js ở tầng ứng dụng kết nối tới SQL Server qua cổng `1433`, chặn toàn bộ mọi truy cập từ các phân vùng khác hoặc từ ngoài Internet.
