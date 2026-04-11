# Hướng Dẫn Tích Hợp Google Sign-In (Expo Auth Session & Firebase JS SDK)

Sử dụng thư viện `expo-auth-session` kết hợp với Authentication của Firebase để đăng nhập bằng Google trên Expo mà không cần phải can thiệp Native Eject.

## 1. Thiết lập trên Google Cloud Console (Lấy Client ID)

Đầu tiên, bạn cần tạo OAuth 2.0 Web Client ID để Expo sử dụng thay mặt cho dứng dụng của bạn khi xác thực với Google.

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Đảm bảo Đã Chọn (hoặc Tạo Mới) Project tương ứng với dự án Firebase của bạn.
3. Vào Menu `APIs & Services` > `Credentials`.
4. Click `+ CREATE CREDENTIALS` -> Chọn `OAuth client ID`.
5. Đặt `Application type` thành **Web application** (Vì Expo Auth Session sử dụng web proxy flow trừ khi build native).
6. Ở mục **Authorized JavaScript origins**, thêm: `https://auth.expo.io`
7. Ở mục **Authorized redirect URIs**, thêm `https://auth.expo.io/@your-expo-username/ecoback` (Thay `your-expo-username` bằng tên tài khoản Expo của bạn).
8. Nhấn **Create**.
9. Copy chuỗi **Client ID** được cấp.

## 2. Thiết lập trên Firebase Console

1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Đi đến dự án của bạn > **Authentication** > Thẻ **Sign-in method**.
3. Chọn **Google** và Bật `Enable`.
4. Điền thẻ **Web client ID** bằng chính Client ID bạn vừa copy ở Bước 1.
5. Nhập Email hỗ trợ dự án và Nhấn **Save**.

## 3. Cập nhật Code triển khai trên LoginScreen

Vào file `d:\Eco_back\src\screens\auth\LoginScreen.tsx` và thực hiện như sau (Đây là mẫu code đã được thiết kế sẵn cho bạn áp dụng):

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@src/config/firebase';

// Lắng nghe WebView tắt đúng cách
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    // ... code cũ ...

    // Khởi tạo Auth Request của Google bằng Expo
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: 'YOUR_WEB_CLIENT_ID_TAI_BUOC_1.apps.googleusercontent.com',
        // Tuỳ chọn (Dành riêng cho Android/iOS build độc lập sau này):
        // androidClientId: '...',
        // iosClientId: '...'
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            // Tiến hành Login bằng Firebase
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
              .then((user) => {
                  console.log("Đăng nhập thành công: ", user);
                  // Gọi store hoặc chuyển hướng về App chính
              })
              .catch((err) => {
                  console.error("Lỗi Google Auth", err);
              });
        }
    }, [response]);

    const handleGoogleLogin = () => {
         promptAsync();
    };

    // JSX:
    // Sửa sự kiện nút Google thành:
    // <TouchableOpacity onPress={handleGoogleLogin}> ...
}
```

## Khắc phục lỗi thường gặp
- *Lỗi redirect_uri_mismatch:* Kiểm tra lại địa chỉ redirect bạn cung cấp trên Google Cloud có đúng với Scheme của Expo chưa. Thông thường Expo Go sẽ cung cấp URL proxy.
- *Lỗi Error 400 (Invalid Client):* Do bạn chèn dư ký tự (khoảng trắng) khi copy dán cấu hình Client ID.
