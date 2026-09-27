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
***Nguyên lý cô lập mạng (Network Isolation)*** là việc phân chia hệ thống mạng thành các vùng riêng biệt để kiểm soát và giới hạn quyền truy cập. Mục tiêu cốt lõi là giảm thiểu bề mặt tấn công (attack surface), đảm bảo nếu một vùng bị hacker xâm nhập, các vùng khác vẫn được bảo vệ an toàn.


### Tại sao Database hoặc Application Server lại bắt buộc phải đặt trong Private Subnet?






























