# Hướng Dẫn Test App EcoBack Bằng Firebase (Frontend)

Tài liệu này hướng dẫn cách kết nối và test ứng dụng di động Eco_back (React Native / Expo) với Firebase.

## 1. Yêu Cầu Chuẩn Bị
- Đã tạo dự án Firebase trên [Firebase Console](https://console.firebase.google.com/).
- Bật **Authentication** với Email/Password cho dự án Firebase của bạn.

## 2. Cấu Hình Firebase Vào App
Trong thư mục app, tôi đã thiết lập sẵn luồng hoạt động Firebase. Bạn cần thay thế thông số trong file `firebaseConfig.ts` (ở gốc hoặc thư mục `src/config`) bằng cấu hình của bạn.
Cách lấy thông tin cấu hình: **Project settings > General > Your apps (chọn nền tảng Web: `</>`)**.

Ví dụ file `src/config/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyxxx...",
  authDomain: "ecoback-test.firebaseapp.com",
  projectId: "ecoback-test",
  storageBucket: "ecoback-test.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

## 3. Cách Chạy App
- Mở terminal và trỏ về thư mục `d:\Eco_back`.
- Chạy lệnh `npx expo start` để khởi động ứng dụng.
- Tải ứng dụng **Expo Go** trên thiết bị thật (App Store / Google Play). Quét mã QR hiển thị ở Terminal để mở ứng dụng EcoBack. Đảm bảo điện thoại và máy tính ở cùng một mạng nội bộ.

## 4. Test Đăng Ký, Đăng Nhập
1. Khi vào app, ứng dụng sẽ chuyển tới màn hình Login/Register nếu chưa xác thực nội bộ.
2. Tại màn **Register**, điền email tùy ý (ví dụ: `demo@ecoback.vn`) và mật khẩu, nhấn nút đăng ký.
3. Kiểm tra trên **Firebase Console -> Authentication -> Users**, bạn sẽ thấy tài khoản vừa được tạo. Thông tin là hợp lệ.
4. Sử dụng tính năng **Login** bằng thư viện Firebase Client SDK. Nếu thành công, app sẽ ghi nhớ session và đưa bạn tới Trang Chủ (Home Dashboard).

## 5. Tự Động Kết Nối Với Backend 
Mobile Application sẽ giao tiếp với EcoBack Backend bằng ID Token lấy từ Firebase:
```typescript
const idToken = await auth.currentUser?.getIdToken();

// Mẫu gọi tới API Backend:
fetch('http://<YOUR_BACKEND_IP>:3000/api/qrs/:id/redeem', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'Idempotency-Key': '<Tránh trùng lặp click>'
    }
});
```
Backend NestJS nhận được yêu cầu sẽ chuyển tiếp token tới Firebase Admin SDK để xác thực chéo (Verify ID Token), lấy `uid`, và tìm kiếm nó trên cơ sở dữ liệu (PostgreSQL) để tiến hành cộng EcoPoints hoặc trừ điểm quy đổi.
