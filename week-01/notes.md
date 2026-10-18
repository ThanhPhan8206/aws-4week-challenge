# Phần 1: Lý thuyết & Thiết kế.

## 1. Sơ đồ kiến trúc.

Sơ đồ 1 VPC chuẩn tối thiểu gồm Public Subnet và Private Subnet trải dài trên 2 Availability Zones (AZs).

``` mermaid
flowchart TB
    Internet["Internet"]:::internetStyle <--> IGW["Internet Gateway (IGW)"]:::igwStyle

    subgraph VPC["Amazon VPC (10.0.0.0/16)"]
        direction TB

        subgraph AZ2["Availability Zone 2"]
            direction TB
            
            subgraph PUB2["Public Subnet 2 (10.0.3.0/24)"]
                direction TB
                NAT2["NAT Gateway 2"]:::componentStyle
            end

            subgraph PRI2["Private Subnet 2 (10.0.4.0/24)"]
                direction TB
                EC2["EC2 / Workload B"]:::componentStyle
            end
            
            NAT2 --> PRI2
            EC2 -.->|"Private Route"| NAT2
        end

        subgraph AZ1["Availability Zone 1"]
            direction TB
            
            subgraph PUB1["Public Subnet 1 (10.0.1.0/24)"]
                direction TB
                NAT1["NAT Gateway 1"]:::componentStyle
            end

            subgraph PRI1["Private Subnet 1 (10.0.2.0/24)"]
                direction TB
                EC1["EC1 / Workload A"]:::componentStyle
            end
            
            NAT1 --> PRI1
            EC1 -.->|"Private Route"| NAT1
        end
    end

    IGW -->|"Public Route"| PUB1
    IGW -->|"Public Route"| PUB2

    class VPC vpcStyle;
    class AZ1,AZ2 azStyle;
```



## 2.Giải thích nguyên lý cô lập mạng.
***Nguyên lý cô lập mạng (Network Isolation)*** là việc phân chia hệ thống mạng lớn thành các vùng mạng (Subnet) độc lập để kiểm soát và giới hạn quyền truy cập. Mục tiêu cốt lõi là giảm thiểu bề mặt tấn công (attack surface), đảm bảo nếu một vùng bị hacker xâm nhập, các vùng khác vẫn được bảo vệ an toàn.


### Tại sao Database hoặc Application Server lại bắt buộc phải đặt trong Private Subnet?
Trong kiến trúc mạng chuẩn (như AWS VPC), hệ thống thường chia thành **Public Subnet** (mạng công cộng) và **Private Subnet** (mạng nội bộ).
- ***Public Subnet***: Chứa các thành phần cần giao tiếp trực tiếp với Internet (như Web Server, Load Balancer, NAT Gateway). Các thiết bị này có Public IP và Route Table dẫn thẳng ra Internet Gateway.
- ***Private Subnet***: Chứa các thành phần nội bộ, không có Public IP và không thể bị truy cập trực tiếp từ Internet.

**Lý do bắt buộc phải đưaDatabase và Application Server vào Private Subnet:**
- **Triệt tiêu đường truy cập trực tiếp từ hacker**: Database chứa dữ liệu nhạy cảm (thông tin người dùng, thẻ tín dụng), còn App Server chứa logic vận hành cốt lõi. Nếu đặt ở Public Subnet, hacker toàn cầu có thể quét thấy IP và tấn công trực tiếp thông qua các lỗ hổng hệ điều hành hoặc brute-force mật khẩu.
- **Thiết lập cơ chế phòng thủ chiều sâu (Defense in Depth)**: Khi nằm ở Private Subnet, traffic từ Internet bắt buộc phải đi qua "lá chắn" đầu tiên là Load Balancer hoặc Web Server ở Public Subnet. Hacker muốn hack Database thì bắt buộc phải hack chiếm quyền kiểm soát Web Server trước, tạo thêm một tầng thử thách khó khăn.
- **Kiểm soát luồng dữ liệu ra (Outbound)**: Các server này không cần chủ động kết nối ra Internet để phục vụ người dùng. Khi cần cập nhật phần mềm hoặc vá lỗi, chúng sẽ đi qua ***NAT Gateway*** (chỉ cho phép đi ra, không cho phép Internet tự ý đi vào), giúp ngăn chặn mã độc tự động gửi dữ liệu ra bên ngoài.

### So sánh sự khác nhau giữa Security Group và NACL khi chặn/mở traffic:

Để điều phối traffic giữa các Subnet này, AWS cung cấp hai công cụ bảo mật vòng ngoài là ***NACL (Network Access Control List)*** và ***Security Group (SG)***.

| Đặc điểm | Security Group (SG) | Network ACL (NACL) |
| :--- | :--- | :--- |
| **Phạm vi bảo vệ** | Cấp độ **Instance / Network Interface (ENI)** (Tường lửa cho từng máy chủ) | Cấp độ **Subnet** (Tường lửa cho cả vùng mạng) |
| **Cấu hình chặn/mở** | Chỉ có luật **Allow** (Cho phép). Mặc định ngầm định block tất cả nếu không cấu hình. | Có cả luật **Allow** và **Deny** (Từ chối đích danh). |
| **Thứ tự áp dụng** | Kiểm tra toàn bộ các luật, chỉ cần thỏa mãn 1 luật là được qua. | Kiểm tra theo thứ tự số thứ tự (Rule number), số nhỏ chạy trước. |
| **Trạng thái lưu trữ** | **Stateful** (Có nhớ trạng thái) | **Stateless** (Không nhớ trạng thái) |


### Ví dụ cụ thể về Stateful (Security Group) vs Stateless (NACL):

Để hiểu rõ sự khác biệt giữa **Stateful** và **Stateless**, hãy lấy ví dụ khi Người dùng ở Internet gửi yêu cầu (Inbound) đến Web Server và Web Server phản hồi lại (Outbound).

#### 1. Cơ chế Stateful của Security Group.
Security Group là tường lửa **có nhớ trạng thái** kết nối.

- **Chiều vào (Inbound)**: Bạn mở port 80 (HTTP) để cho phép khách truy cập Web Server. Khách gửi một request vào port 80. Security Group kiểm tra thấy hợp lệ và cho qua, đồng thời tự động ghi nhớ kết nối này.
- **Chiều ra (Outbound)**: Khi Web Server xử lý xong và gửi dữ liệu phản hồi lại cho khách qua một port ngẫu nhiên (Ephemeral port), Security Group nhìn vào bộ nhớ, nhận ra đây là phản hồi của kết nối hợp lệ lúc nãy. Nó **tự động cho qua** mà bạn không cần phải cấu hình bất kỳ luật Outbound nào.

#### 2. Cơ chế Stateless của NACL.
**NACL** là tường lửa không nhớ trạng thái. Nó kiểm tra chiều vào và chiều ra hoàn toàn độc lập, như hai người bảo vệ nghiêm ngặt không bao giờ nói chuyện với nhau.

- **Chiều vào (Inbound)**: Bạn phải tạo một luật (ví dụ: Rule 100) cho phép nhận traffic vào port 80. Yêu cầu đi qua NACL thành công.
- **Chiều ra (Outbound)**: Khi Web Server phản hồi lại khách, NACL **không hề biết** đây là phản hồi của yêu cầu lúc nãy. Nó sẽ chặn đứng gói tin lại. Để phản hồi đi ra được, **bắt buộc phải tạo thêm một luật Outbound** mở dải port ngẫu nhiên (Ephemeral Ports từ _1024_ đến _65535_) để cho phép dữ liệu trả về cho khách.








