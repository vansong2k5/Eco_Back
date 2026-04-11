# EcoBack — Production-Ready App Guide

## 📁 Cấu Trúc Project

```
d:\Eco_back\
├── app/                          # Expo Router routes
│   ├── _layout.tsx               # Root layout + Auth Guard (Zustand)
│   ├── login.tsx                 # → src/screens/auth/LoginScreen
│   ├── register.tsx              # → src/screens/auth/RegisterScreen
│   ├── forgot-password.tsx       # → src/screens/auth/ForgotPasswordScreen
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar layout (5 tabs)
│       ├── index.tsx             # → HomeScreen
│       ├── map.tsx               # → MapScreen
│       ├── scan.tsx              # → ScanScreen (QR Camera)
│       ├── rewards.tsx           # → RewardsScreen
│       └── profile.tsx           # → ProfileScreen
│
├── src/                          # Scalable source code
│   ├── config/
│   │   └── firebase.ts           # Firebase init (env-aware)
│   ├── constants/
│   │   ├── colors.ts             # Design tokens: brand, semantic
│   │   ├── typography.ts         # FontSize, FontWeight
│   │   └── spacing.ts            # Spacing, Radius, Shadow
│   ├── types/
│   │   ├── models.ts             # Domain types: User, QR, Transaction, Reward
│   │   └── result.ts             # Result<T>, ok(), err(), mapFirebaseError()
│   ├── services/
│   │   ├── auth.service.ts       # Firebase Auth + Firestore profile creation
│   │   └── firestore.service.ts  # Transactions, Rewards, CollectionPoints
│   ├── store/
│   │   ├── auth.store.ts         # Zustand: user, profile, login/register/logout
│   │   └── app.store.ts          # Zustand: transactions, rewards, points
│   ├── utils/
│   │   ├── validators.ts         # email, password, phone, required validators
│   │   └── formatters.ts         # formatVND, formatPoints, timeAgo, getInitials
│   ├── components/common/
│   │   ├── AppButton.tsx         # Button: primary/secondary/outline/ghost/danger
│   │   ├── AppInput.tsx          # Input + AppPasswordInput with show/hide
│   │   └── UI.tsx                # Card, EmptyState, SectionHeader, Badge, Divider
│   └── screens/
│       ├── HomeScreen.tsx        # Dashboard: balance, actions, rewards, transactions
│       ├── ScanScreen.tsx        # QR camera scanner with frame overlay
│       ├── RewardsScreen.tsx     # Voucher list with category filter
│       ├── ProfileScreen.tsx     # User profile, stats, menu, logout
│       └── auth/
│           ├── LoginScreen.tsx   # Email/password + form validation
│           ├── RegisterScreen.tsx
│           └── ForgotPasswordScreen.tsx
│
└── docs/
    └── Firebase_Testing_Guide.md  # Hướng dẫn kết nối Firebase
```

---

## 🔥 Cài Đặt Firebase (Bắt buộc trước khi chạy)

### Bước 1: Tạo dự án Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com)
2. Nhấn **Add project** → đặt tên `ecoback-dev`
3. Tắt Google Analytics (không cần cho dev)

### Bước 2: Kích hoạt Authentication
```
Firebase Console → Authentication → Get started
→ Sign-in method → Email/Password → Enable
```

### Bước 3: Kích hoạt Firestore
```
Firebase Console → Firestore Database → Create database
→ Start in test mode (cho development)
→ Chọn location: asia-southeast1 (Singapore)
```

### Bước 4: Lấy cấu hình Firebase
```
Firebase Console → Project Settings → General
→ Your apps → Web (</>)
→ Register app → Copy firebaseConfig
```

### Bước 5: Điền vào cấu hình
Mở `src/config/firebase.ts` và thay thế hoặc tạo file `.env`:

**Cách A: Trực tiếp (Development nhanh)**
```typescript
// src/config/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXX...",
  authDomain: "ecoback-dev.firebaseapp.com",
  projectId: "ecoback-dev",
  storageBucket: "ecoback-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

**Cách B: Biến môi trường (Recommended Production)**
Tạo file `.env` ở gốc project (`d:\Eco_back\.env`):
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=ecoback.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ecoback
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=ecoback.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 🚀 Chạy App

```bash
cd d:\Eco_back
npx expo start
```

Quét QR bằng **Expo Go** (iOS/Android) hoặc nhấn `a` cho Android Emulator.

---

## 🧪 Test Authentication Flow

### 1. Đăng ký tài khoản mới
- Vào màn hình Login → nhấn "Đăng ký ngay"
- Điền: Họ tên, Email, Mật khẩu (≥6 ký tự), Xác nhận mật khẩu
- Nhấn Đăng Ký → Tự động về trang chủ
- **Verify**: Firebase Console → Authentication → Users → Thấy tài khoản mới

### 2. Kiểm tra Firestore Profile
```
Firebase Console → Firestore → users/{uid}
```
Sẽ thấy document với: uid, email, displayName, ecoPoints: 0, totalRecycled: 0

### 3. Test Đăng nhập / Đăng xuất
- Đăng xuất (Profile → Đăng xuất) → App redirect về Login
- Đăng nhập lại → App redirect về Home

### 4. Test Quên mật khẩu
- Login → Quên mật khẩu → Nhập email → Nhận email từ Firebase

---

## 🔒 Firestore Security Rules (Production)

Thay test rules bằng:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Transactions: user can only read their own
    match /transactions/{txId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    // Rewards: anyone authenticated can read
    match /rewards/{rewardId} {
      allow read: if request.auth != null;
    }
    // Collection points: public read
    match /collection_points/{pointId} {
      allow read: if true;
    }
  }
}
```

---

## 🔗 Kết nối với EcoBack Backend (NestJS)

Khi scan QR, mobile gọi API backend với Firebase ID Token:

```typescript
// Sau khi scan QR thành công
import { auth } from '@src/config/firebase';

const callBackendAPI = async (qrData: string) => {
  const idToken = await auth.currentUser?.getIdToken();
  
  const response = await fetch('http://YOUR_BACKEND_IP:3000/api/qrs/redeem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'Idempotency-Key': crypto.randomUUID(), // Tránh duplicate
    },
    body: JSON.stringify({ qrId: qrData }),
  });
  
  return response.json();
};
```

Backend NestJS (`ecoback-backend`) xác thực ID Token qua Firebase Admin SDK và:
1. Verify token → lấy `uid`
2. Tìm QR Code trong PostgreSQL
3. Atomic increment EcoPoints trong Wallet
4. Ghi Transaction + OutboxEvent trong cùng 1 transaction
5. Trả về `{ pointsEarned, newBalance }`

---

## 📦 Dependencies Đã Cài

```json
{
  "firebase": "^10.x",
  "zustand": "^5.x",
  "expo-linear-gradient": "~14.x",
  "@react-native-async-storage/async-storage": "^2.x",
  "expo-camera": "^15.x"
}
```

---

## ⚡ Tech Stack

| Thành phần | Công nghệ | Mục đích |
|---|---|---|
| Framework | Expo SDK 54 + React Native | Cross-platform mobile |
| Routing | Expo Router (file-based) | Navigation + Auth Guard |
| State | Zustand | Global state, no boilerplate |
| Auth | Firebase Authentication | Email/password, session persist |
| Database | Firestore | Realtime user data |
| UI | Custom Design System | MoMo-inspired, premium feel |
| Types | TypeScript strict | Type safety end-to-end |
| Camera | expo-camera | QR code scanning |
| Animation | expo-linear-gradient | Gradient balance card |
