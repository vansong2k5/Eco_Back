# 📚 Tài Liệu Hướng Dẫn Vận Hành EcoBack 

Tài liệu này hướng dẫn chi tiết cách Vận Hành, Quản Lý và Chạy thử các tính năng mới sau khi cập nhật hệ thống (Version 2.0).

---

## 1. Dành cho Người dùng (Frontend App)

### 🌿 Tạo Đơn Thu Gom (Thay vì nút Đổi Quà)
- Trên ứng dụng **Trang chủ** có giao diện thẻ xanh lớn, chọn **"Tạo Đơn"**.
- Chức năng này hỗ trợ 2 tùy chọn vận chuyển có logic tính điểm EcoPoints khác nhau:
    1. **Thu Tận Nơi (PICKUP):** 
        - Nhập `Số Kg` rác. Form tự động tính base `EcoPoints` = `(Kg * 10)`.
        - Cần nhập **địa chỉ Google Maps** để nhân viên tìm định vị.
    2. **Tự Mang Đến Trạm (DROPOFF):** 
        - Bạn không cần nhập địa chỉ.
        - **Bonus:** Hệ thống sẽ +20% phần thưởng EP cho sự nỗ lực tự vận chuyển tới trạm hệ thống 🚀. 

### 📦 Quản lý Lịch Sử Giao Dịch
- Các đơn vừa tạo sẽ không còn bị lạc mất! Vào menu **"Lịch sử" (Orders)** từ mục Quick Actions ở Trang chủ, hoặc qua Tab Lịch Sử. Toàn bộ thông tin: Địa chỉ, Tình trạng *(Đang chờ, Hoàn tất)*, Ước tính Bonus... đều được cập nhật thời gian thực không độ trễ. 
- Mọi hoạt động sẽ chạy mượt hơn do thuật toán Firebase Snap được tối ưu để tránh vướng phải `Composite Index`.

---

## 2. Dành cho Ban Quản Trị Hệ Thống (Admin Dashboard)

Hệ thống Admin đã được nâng cấp để tạo ra góc nhìn Panorama toàn diện từ dòng chảy rác đến phần thưởng.

### 🔍 Quản Lý Ghi Log Toàn Diện (Trang Lịch Sử)
- **Truy cập:** Mở app với Quyền Admin → Chọn Tab **"Lịch sử"**.
- **Hiển thị Log:**
  - Hoạt động tạo mã (Kiếm EP - `EARN`)
  - Hoạt động quy đổi (Đổi quà - `REDEEM`)
  - Hoạt động cấp đơn mới (Tạo đơn `ORDER` từ phía người dùng). Tất cả log người dùng từ Create Request sẽ phản chiếu song song lập tức về dashboard giúp bạn duyệt và theo dõi trạng thái, User ID, thời gian... dễ dàng. 

### 🖨️ Tính Năng Tạo/In Mã QR
- Tab **"Tạo Mã QR"** bên dưới.
- Khung thông tin đã chỉnh lý chuẩn chỉnh, chuyển đổi mục **Tên Trạm Thu / Môi giới** => thành **Tên Công ty / Cá Nhân**. Từ đây Admin xuất file quy chuẩn báo cáo ESG, gán nhãn chính xác loại hình theo Công Ty hoặc Cá Nhân.

---

## 3. Khởi Dựng & Deploy Hệ Thống Cục Bộ

Do hệ thống hiện nay chạy qua **Cấu hình Local Networking** cho Mobile/Expo thay vì Localhost ảo, hãy đảm bảo:

1. **Khởi chạy Backend (PostgreSQL + Tốc độ Cache):**
   ```bash
   cd ecoback-backend
   docker-compose up -d    # Chạy DB + Redis
   npm run start:dev       # Khởi động Core Backend
   ```
   *(Trạng thái hợp lệ: Server báo `200` tại url `...:3000/health` trên powershell).*
   
2. **Setup Frontend:**
   - App đã chạy với file `.env` cấp quyền `EXPO_PUBLIC_API_URL=http://<IP-CỦA-BẠN>:3000` *(ở máy hiện tại tôi đã chỉnh là `10.17.52.35` để Android không bị timeout).*
   - Nếu bạn thay đổi kết nối Wifi, nhớ gõ lệnh `ipconfig`, lấy địa chỉ mới chép vào `/Eco_back/.env`, rồi chạy:
   ```bash
   npx expo start -c
   ```
   *(Gắn cờ `-c` để xóa bộ nhớ cache expo, nhận thông số api mới nhất).*

---

*Hệ thống được phát triển hoàn thiện với Typescript Check (0 Error) và Firestore Logic chuẩn.*
