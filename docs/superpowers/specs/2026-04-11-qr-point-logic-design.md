# EcoBack QR point & Dashboard Logic

## 1. Mục tiêu kiến trúc (Goal)
Refactor hệ thống EcoBack QR Flow và Admin Dashboard. Trọng tâm chuyển đổi từ "Nhận điểm tức thì (Instant Points)" sang "Theo dõi điểm treo (Processing Points)" với chính sách quá hạn 7 ngày áp dụng bằng chiến lược "Lazy Evaluation". 

## 2. Lược đồ Cơ sở Dữ liệu (Database Schema Update)

**Cập nhật `Transaction` Model (`src/types/models.ts`)**
Thay vì chỉ chứa EARN và REDEEM, Transaction mang trách nhiệm đại diện cho toàn bộ Data Point trong Lifecycle điểm thưởng.
```typescript
export interface Transaction {
  id: string;
  userId: string;
  type: 'EARN' | 'REDEEM' | 'ORDER';
  amount: number;       // Giá trị thực tế đã cấp (Lúc tạo sẽ là 0)
  kg?: number;          // Trọng lượng rác đối chiếu
  description: string;
  qrId?: string;
  requestId?: string;
  status: 'PROCESSING' | 'APPROVED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
  expireAt?: Date;      // createdAt + 7 days
  approvedAt?: Date;
}
```

## 3. Kiến trúc Đánh giá Trễ (Lazy Evaluation Architecture)

Hệ thống sẽ không chạy Cronjob cứng. Thay vào đó, mọi truy vấn API (Fetch history, Compute User stats, Charting) sẽ chạy thông qua 1 Lớp Filter Logic phía Client (hoặc Node.js Service nếu có backend rời):

**`TransactionService.evaluateTransaction(tx: Transaction): Transaction`**
- Input: Database tx record
- Check: Nếu `tx.status === 'PROCESSING'` và `Date.now() > tx.expireAt`
- Update: Trả về trạng thái `EXPIRED` và bắn Asynchronous Dispatch (Lệnh ẩn) vào Firestore để cập nhật Data thật, tránh delay trải nghiệm người dùng.

## 4. Giao diện và Dashboard (UI & Dashboard)

### 4.1 Admin Analytics Panel
- **Tổng User:** Tính từ tập `collection('users')`. Phân loại được bằng cách check xem mảng `transactions` có bản ghi nào hay không (Active vs Inactive).
- **Tổng Kg Rác Tái Chế:** `SUM(tx.kg) WHERE tx.status === 'APPROVED'`. Không aggregate mù quáng từ `collection_requests` nếu nó chưa ở trạng thái chốt sổ.

### 4.2 Dynamic Charts
Chuyển đổi render từ biểu đồ cột thô ráp sang hệ thống UI phức hợp đáp ứng:
- **Bar chart / Pie Chart Status:** Sử dụng các View Bar có Flex Tỷ lệ để Build UI Trạng thái (Green / Yellow / Red).
- Các QR Đang xử lý sẽ bị làm mờ, các QR Hoàn thành sẽ nổi bật.

### 4.3 Color Palettes (Thiết kế đồng bộ)
- `APPROVED` (Thành công): 🟢 `#4CAF50` (Tươi sáng)
- `PROCESSING` (Chờ thu gom): 🟡 `#FFC107` (Cảnh báo chú ý)
- `EXPIRED` / `CANCELLED` (Trễ hẹn / Hủy): 🔴 `#F44336` (Nổi gạch ngang qua text khoản thưởng)

## 5. Phương pháp triển khai vào Source Code

**Phase 1:** Update Schema TypeScript (`models.ts`) & UI States (`app/(admin)/index.tsx`).  
**Phase 2:** Update logic `ScanScreen` / `qr.service.ts` để lưu `PROCESSING` và set `expireAt`.  
**Phase 3:** Update logic `collection.service` để chốt sổ (lật trạng thái thành `APPROVED`, cộng điểm `ecoPoints`).  
**Phase 4:** Refresh Code logic hiển thị ở `HomeScreen` (User) và `index.tsx` (Admin) sử dụng hàm `Lazy Evaluation`.  

---
*Văn bản thiết kế đã được Review: Sạch sẽ, không dồn nén dữ liệu, và xử lý triệt để nhu cầu không tốn phí Hosting Cron.*
