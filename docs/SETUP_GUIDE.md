# 🌿 EcoBack — Hướng Dẫn Cài Đặt & Khởi Động App

> Tài liệu này hướng dẫn từng bước để chạy EcoBack App đúng cách. Mỗi bước đều có giải thích để bạn hiểu tại sao làm vậy và dễ debug khi có lỗi.

---

## 📋 Yêu Cầu Hệ Thống

| Công cụ | Phiên bản tối thiểu | Kiểm tra |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Docker Desktop | Latest | Mở Docker Desktop |
| Git | Any | `git --version` |
| Expo Go (điện thoại) | Latest | Tải từ App Store / Play Store |

---

## 🏗️ Kiến Trúc Hệ Thống

```
EcoBack/
├── app/              → Expo Router screens (file-based routing)
│   ├── _layout.tsx   → Root layout, auth guard, theme
│   ├── (tabs)/       → Tab navigator (Home, Scan, Rewards, Profile)
│   ├── login.tsx     → Màn hình đăng nhập
│   └── register.tsx  → Màn hình đăng ký
├── src/
│   ├── config/
│   │   └── firebase.ts   → Firebase SDK init (Auth + Firestore)
│   ├── constants/
│   │   ├── colors.ts     → Brand colors từ logo
│   │   ├── typography.ts → Font sizes, weights
│   │   └── spacing.ts    → Padding, margin, radius, shadow
│   ├── store/
│   │   ├── auth.store.ts → Zustand: user auth state
│   │   └── app.store.ts  → Zustand: app data (points, transactions)
│   ├── services/
│   │   └── auth.service.ts → Firebase Auth + Firestore operations
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx    → Đăng nhập + lưu mật khẩu
│   │   │   ├── RegisterScreen.tsx → Đăng ký tài khoản
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── HomeScreen.tsx    → Trang chủ (balance, quick actions)
│   │   ├── ScanScreen.tsx    → QR Scanner (feature chính)
│   │   ├── RewardsScreen.tsx → Đổi điểm, marketplace
│   │   └── ProfileScreen.tsx → Thông tin cá nhân
│   └── components/
│       └── common/
│           ├── UI.tsx       → Card, Badge, EmptyState, Divider
│           ├── AppButton.tsx → Button with variants
│           └── AppInput.tsx  → Input + Password input
├── ecoback-backend/  → Backend Node.js (chạy bằng Docker)
│   └── docker-compose.yml → PostgreSQL + Redis + API Server
├── babel.config.js   → Path alias @src/* resolver ⚠️ QUAN TRỌNG
├── tsconfig.json     → TypeScript config với path mappings
└── app.json         → Expo config (icon, splash, permissions)
```

---

## 🚀 Hướng Dẫn Khởi Động Chi Tiết

### BƯỚC 1 — Cài Dependencies

```bash
cd d:\Eco_back
npm install
```

**Tại sao?**  
Cài tất cả thư viện trong `package.json`. Nếu thiếu bước này, app sẽ báo lỗi "Cannot find module" ngay lập tức.

**Dấu hiệu thành công:** Hiện `added X packages in Xs` không có lỗi đỏ.

**Bug thường gặp:**
- `EACCES permission denied` → Chạy terminal với quyền Admin
- `npm ERR! code ERESOLVE` → Thêm flag `--force` vào lệnh npm install

---

### BƯỚC 2 — Khởi Động Backend (Docker)

```bash
cd d:\Eco_back\ecoback-backend
docker-compose up -d
```

**Tại sao?**  
Backend cần chạy trước vì app gọi API để:
- Verify QR codes
- Lưu transactions vào PostgreSQL
- Cache với Redis

**Flag `-d`** = detached mode, chạy ngầm không chiếm terminal.

**Kiểm tra backend đã chạy:**
```bash
docker ps
# Phải thấy: ecoback-postgres, ecoback-redis, ecoback-api
```

**Kiểm tra API healthy:**
```bash
curl http://localhost:3000/health
# Phải trả về: {"status":"ok"}
```

**Bug thường gặp:**
- `Cannot connect to Docker daemon` → Mở Docker Desktop trước
- `Port 5432 already in use` → PostgreSQL local đang chạy, stop nó: `net stop postgresql-x64-14` (Windows)
- `Port 3000 already in use` → Đổi port trong `docker-compose.yml`
- Container crash ngay sau khi start → Xem log: `docker-compose logs api`

---

### BƯỚC 3 — Cấu Hình Firebase

File: `src/config/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyD8chMmC-k_wad1URbwAaFlHjUhU1MxMYQ",
  authDomain: "ecoback-1adde.firebaseapp.com",
  projectId: "ecoback-1adde",
  // ...
};
```

**Tại sao?**  
Firebase xử lý Authentication (đăng nhập/đăng ký) và Firestore (lưu user profile). App KHÔNG thể đăng nhập nếu Firebase config sai.

**Kiểm tra Firebase hoạt động:**
1. Vào [Firebase Console](https://console.firebase.google.com/project/ecoback-1adde)
2. Authentication → Users → Phải thấy danh sách users
3. Firestore → users collection → Phải thấy user documents

**Bug thường gặp:**
- `auth/network-request-failed` → Không có internet hoặc Firebase project bị disabled
- `auth/invalid-api-key` → API key trong `firebase.ts` sai
- `auth/user-not-found` → User chưa tồn tại trong Firebase Auth

---

### BƯỚC 4 — Khởi Động Expo Dev Server

```bash
cd d:\Eco_back
npx expo start
```

**Tại sao?**  
Expo Metro Bundler sẽ:
1. Đọc `babel.config.js` để setup path aliases (`@src/*`)
2. Bundle tất cả JS/TS files
3. Tạo QR code để kết nối điện thoại
4. Bật hot reload (thay đổi code → app tự cập nhật)

**Dấu hiệu thành công:** Terminal hiện QR code và dòng chữ "Metro waiting on..."

**Sau khi server khởi động, bạn thấy menu:**
```
› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web
› Press r │ reload app
› Press c │ show QR code
```

**Bug thường gặp:**
- `Error: Cannot find module 'babel-plugin-module-resolver'` → Chạy `npm install` lại (Bước 1)
- `Unable to resolve module @src/constants/colors` → Babel config chưa được load, nhấn `r` để reload hoặc restart Metro
- `Port 8081 already in use` → Dừng Expo server cũ hoặc dùng: `npx expo start --port 8082`

---

### BƯỚC 5 — Kết Nối Điện Thoại

**Cách A — Dùng Expo Go (Nhanh nhất):**
1. Cài [Expo Go](https://expo.dev/client) trên điện thoại
2. Điện thoại và máy tính phải **cùng mạng WiFi**
3. Quét QR code hiện trong terminal
4. App sẽ load trong Expo Go

**Cách B — Android Emulator:**
```bash
npx expo start --android
```
Cần: Android Studio + AVD Manager đã setup.

**Cách C — iOS Simulator (Mac only):**
```bash
npx expo start --ios
```

**Bug thường gặp:**
- `Network response timeout` → Điện thoại và máy tính khác mạng WiFi
- App load nhưng trắng tinh → Xem Expo Go console (shake điện thoại → Open Debugger)
- `exp://...` không mở được → Đổi sang Tunnel mode: `npx expo start --tunnel`

---

### BƯỚC 6 — Xác Nhận App Chạy Đúng

Checklist sau khi app load:

- [ ] **Splash screen:** Hiện logo EcoBack (nền xanh lá, icon túi tái chế trắng)
- [ ] **Login screen:** Hiện logo + form đăng nhập
- [ ] **Đăng nhập:** Dùng `test@ecoback.vn` / `123456`
- [ ] **Home screen:** Hiện EcoPoints balance và tab bar ở dưới
- [ ] **Scan tab:** Nhấn nút scan tròn xanh (giữa tab bar)
- [ ] **Tab Navigation:** Chuyển qua các tab Rewards, Profile

---

## 🔧 Debug Nhanh — Tra Cứu Lỗi

### Lỗi TypeScript (import path)
```
Cannot find module '@src/constants/colors'
```
**Fix:** Kiểm tra `babel.config.js` có tồn tại không. Nếu có, restart Metro: `Ctrl+C` rồi `npx expo start --clear`

---

### Lỗi Firebase Auth
```
auth/network-request-failed
```
**Fix:** Check internet. Vào Firebase Console xem project còn active không.

---

### Lỗi màn hình trắng sau đăng nhập
**Nguyên nhân thường gặp:**
1. Redux/Zustand store bị reset
2. Navigation guard trong `_layout.tsx` bị loop

**Debug:** Shake điện thoại → Open JS Debugger → Xem console.error

---

### Docker backend không start
```bash
# Xem log chi tiết
docker-compose logs --tail=50 api

# Reset hoàn toàn
docker-compose down -v
docker-compose up -d
```

---

### Reset Cache Hoàn Toàn (nuclear option)
```bash
# Stop Expo
Ctrl + C

# Clear Metro cache
npx expo start --clear

# Hoặc clear toàn bộ
cd d:\Eco_back
Remove-Item -Recurse -Force .expo
npm install
npx expo start --clear
```

---

## 📁 Files Quan Trọng Nhất

| File | Vai trò | Khi nào cần sửa |
|---|---|---|
| `babel.config.js` | Path alias `@src/*` → `./src/*` | Khi thêm alias mới |
| `tsconfig.json` | TypeScript path mappings | Khi TS báo cannot find module |
| `src/config/firebase.ts` | Firebase credentials | Khi đổi Firebase project |
| `app.json` | Icon, splash, permissions | Khi đổi tên app hoặc thêm permission |
| `src/constants/colors.ts` | Brand colors từ logo | Khi redesign |
| `src/store/auth.store.ts` | Auth state (Zustand) | Khi thêm auth feature |
| `app/_layout.tsx` | Auth guard + navigation | Khi thêm màn hình mới |

---

## 🗄️ Cấu Trúc URL API Backend

| Endpoint | Chức năng |
|---|---|
| `GET /health` | Kiểm tra backend alive |
| `POST /api/auth/qr/redeem` | Redeem QR code |
| `GET /api/wallet/:uid` | Lấy EcoPoints balance |
| `GET /api/wallet/:uid/transactions` | Lịch sử giao dịch |

Base URL: `http://localhost:3000` (development)

---

## 🔐 Tài Khoản Test

| | |
|---|---|
| **Email** | test@ecoback.vn |
| **Password** | 123456 |
| **Lưu ý** | Tài khoản này trong Firebase Authentication dev project |

---

## 📞 Khi Stuck

1. Đọc lại error message **kỹ** — thường có hint rõ ràng
2. Xem log trong terminal Expo (`npx expo start`)  
3. Xem log Docker: `docker-compose logs api`
4. Clear cache: `npx expo start --clear`
5. Restart Docker: `docker-compose restart`
6. Nuclear reset (xem phần "Reset Cache Hoàn Toàn" ở trên)
