# 🌍 EcoBack - System Architecture & Product Design

Dưới đây là tài liệu thiết kế bản quyền cho hệ thống **EcoBack** ở mức độ Production-ready, bao phủ Backend, Frontend, UI/UX, bảo mật và khả năng mở rộng.

---

## 1. 🏗 System Architecture (Kiến trúc Hệ thống)

### Tổng quan Kiến trúc (High-Level)
Hệ thống áp dụng kiến trúc linh hoạt với các thành phần chính:
*   **Client App (React Native - Expo):** Ứng dụng di động.
*   **API Gateway (Node.js/Express hoặc FastAPI):** Tiếp nhận, xác thực token.
*   **Backend Services:**
    *   `Auth Service`: Xử lý đăng nhập, RBAC, cấp phát JWT.
    *   `QR/Transaction Service`: Xử lý transaction tái chế (dùng pessimistic locking).
    *   `Wallet/Reward Service`: Quản lý điểm EcoPoints.
    *   `Admin/Analytics Service`: Xuất report.
*   **Database (PostgreSQL):** Lưu trữ chính vì yêu cầu toàn vẹn ACID.
*   **Cache & Message Queue (Redis):** Cache metadata QR, quản lý rate limiting, chặn double-scan.

---

## 2. 🗄️ Database Schema (PostgreSQL)

```sql
CREATE TABLE Users (
    id UUID PRIMARY KEY,
    role VARCHAR(20) DEFAULT 'USER', 
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(100),
    eco_points BIGINT DEFAULT 0,
    eco_level VARCHAR(50) DEFAULT 'Green Rookie'
);

CREATE TABLE CollectionPoints (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8)
);

CREATE TABLE QrCodes (
    id UUID PRIMARY KEY,
    batch_id VARCHAR(100),
    point_id UUID REFERENCES CollectionPoints(id),
    signature VARCHAR(255) NOT NULL,
    scan_limit INT DEFAULT 1,
    scanned_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ACTIVE' 
);
```

---

## 3. 🌐 API Design (RESTful)

### 3.1. User APIs
*   **`POST /api/auth/google`**: Đăng nhập bằng Google.
*   **`POST /api/qr/scan`**: Ghi nhận điểm (`{ "qr_id": "uuid", "signature": "xxx", "lat": 10.1, "lng": 106.1 }`).

### 3.2. Admin APIs (Require `role=ADMIN`)
*   **`POST /api/admin/qr/generate`**: Tự động sinh hàng loạt mã QR theo điểm thu gom.
*   **`GET /api/admin/fraud`**: Cảnh báo user/thiết bị có hành vi nghi ngờ.

---

## 4. 📱 UI Screen Breakdown (React Native)

Trải nghiệm UI/UX hướng tới **gamification và tương tác vi mô**.
1.  **Home Dashboard:** 
    *   *Gamification Header:* Avatar, mức độ Eco (Eco Level).
    *   *Center Card:* Ví EcoPoints.
2.  **Scan QR (Camera):** Khi quét thành công -> Hiệu ứng lá cây bay lên.
3.  **Success Result Screen:** 
    *   Thông số: "+10 EcoPoints" | "Giảm 50g CO2".
4.  **Map / Locator Screen:** Google Maps chỉ ra các điểm thu gom. Nhấn vào 1 trạm hiện Tooltip: Số lần rác tại điểm này đã được quét/tái chế.

---

## 5. 🔒 Luồng Quét mã & Bảo mật QR (Anti-Fraud)

Nguyên tắc: QR Code KHÔNG lưu điểm thô.
**Cấu trúc dữ liệu:** `ecoback://scan?qr_id=123e4567&exp=1712760000&sig=a8f5f167...`

**Luồng Validate QR an toàn:**
1.  **Backend - Validate Signature (HMAC):** Ngăn ngừa làm giả nội dung QR.
2.  **Backend - Pessimistic Lock (Redis):** Chặn các request double-scan ở cùng 1 giây.

---

## 6. 🌱 Gamification & Scale Suggestions
*   **AI Anti-Fraud Model:** Tracking tọa độ GPS khi người dùng quét so với địa chỉ của trạm. (Ngăn chặn việc mang QR về nhà).
*   **Báo cáo ESG ESG:** Xuất file đánh giá mức giảm phát thải CO2.
