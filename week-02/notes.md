# Phần 1: Lý thuyết và Tài liệu.

## 1. Packet Walk (Luồng đi của gói tin)

Kiến trúc mạng được thiết kế theo nguyên tắc Network Isolation để đảm bảo tính bảo mật. Dưới đây là phân tích chi tiết đường đi của 2 luồng traffic chính:

### a. Inbound Traffic (Mạng ngoài gọi vào App)
Đường đi: **Internet → IGW → Public Subnet (Load Balancer / Reverse Proxy) → Private Subnet (App Server / DB)**

**Chi tiết luồng đi:**
1. Người dùng (Client) từ Internet gửi request truy cập vào ứng dụng.
2. Request đi qua **Internet Gateway (IGW)** của VPC.
3. Gói tin được định tuyến vào **Public Subnet**, nơi chứa Load Balancer hoặc EC2 instance chạy Reverse Proxy (ví dụ: Nginx).
4. Reverse Proxy tiếp nhận request, xử lý và điều hướng gói tin vào các App Server hoặc Database đang nằm an toàn trong **Private Subnet** (nơi không có Public IP, không tiếp xúc trực tiếp với Internet).

### b. Outbound Traffic (App trong Private Subnet gọi ra Internet)
Đường đi: **Private Subnet (App Server) → NAT Gateway (Public Subnet) → IGW → Internet**

**Chi tiết luồng đi:**
1. Khi App Server trong **Private Subnet** cần kết nối ra Internet (để kéo npm package, tải weights model AI, hoặc update OS), nó sẽ gửi request đi.
2. Vì Private Subnet không có kết nối trực tiếp với Internet, Route Table sẽ điều hướng gói tin này tới **NAT Gateway** (được đặt tại Public Subnet).
3. NAT Gateway thay mặt App Server đẩy request ra ngoài thông qua **Internet Gateway (IGW)**.
4. Gói tin ra tới Internet, lấy dữ liệu và trả về theo luồng ngược lại.

---

## 2. Security Group Configuration

Để kiểm soát luồng traffic trên, dưới đây là bảng cấu hình quy tắc (Rules) Inbound và Outbound cho từng Security Group (SG).

### A. Public Subnet Security Group (Dành cho EC2 Nginx / ALB)
Nhiệm vụ: Mở cửa đón traffic từ người dùng Internet và chỉ chuyển tiếp vào Backend.

| Loại Rule | Protocol | Port Range | Source / Destination | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **Inbound** | HTTP | 80 | `0.0.0.0/0` (Internet) | Cho phép truy cập web HTTP từ mọi nơi |
| **Inbound** | HTTPS | 443 | `0.0.0.0/0` (Internet) | Cho phép truy cập web HTTPS từ mọi nơi |
| **Inbound** | SSH | 22 | `[IP_Của_Bạn]/32` | Tùy chọn: Chỉ cho phép IP cá nhân SSH vào |
| **Outbound** | All traffic | All | `0.0.0.0/0` | Cho phép EC2 gọi ra ngoài (để giao tiếp với Private Subnet và ra Internet) |

### B. Private Subnet Security Group (Dành cho App Server / Database EC2)
Nhiệm vụ: Bảo mật tối đa, chỉ nhận traffic nội bộ từ Public Subnet.

| Loại Rule | Protocol | Port Range | Source / Destination | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| **Inbound** | Custom TCP | `[Port_App]` (VD: 5000) | `[Public_Subnet_SG_ID]` | Chỉ nhận request HTTP/API từ Public Subnet SG |
| **Inbound** | SSH | 22 | `[Public_Subnet_SG_ID]` | Cho phép SSH từ Public EC2 (hoặc Bastion Host) vào |
| **Outbound** | All traffic | All | `0.0.0.0/0` | Cho phép App Server gọi ra ngoài (đi qua NAT Gateway) |
