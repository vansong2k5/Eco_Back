export type AppError = {
  code: string;
  message: string;
};

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err(code: string, message: string): Result<never> {
  return { success: false, error: { code, message } };
}

// Map Firebase auth error codes to user-friendly messages
export function mapFirebaseError(error: any): AppError {
  const code = error?.code ?? 'unknown';
  const messages: Record<string, string> = {
    'auth/user-not-found': 'Email không tồn tại trong hệ thống.',
    'auth/wrong-password': 'Mật khẩu không đúng.',
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/email-already-in-use': 'Email đã được sử dụng.',
    'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'auth/too-many-requests': 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Không có kết nối mạng. Kiểm tra lại.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập chưa được bật. Liên hệ quản trị viên.',
    'auth/configuration-not-found': 'Cấu hình Firebase chưa đúng. Liên hệ quản trị viên.',
    'auth/internal-error': 'Lỗi hệ thống. Vui lòng thử lại sau.',
    'auth/invalid-api-key': 'API key không hợp lệ. Liên hệ quản trị viên.',
    'auth/app-not-authorized': 'Ứng dụng chưa được cấp quyền sử dụng Firebase Auth.',
    'auth/requires-recent-login': 'Vui lòng đăng nhập lại để thực hiện thao tác này.',
    'auth/credential-already-in-use': 'Thông tin xác thực đã được liên kết với tài khoản khác.',
    'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã bị đóng.',
    'auth/cancelled-popup-request': 'Yêu cầu đã bị huỷ.',
    'auth/missing-email': 'Vui lòng nhập email.',
    'auth/missing-password': 'Vui lòng nhập mật khẩu.',
  };

  // Log unmapped errors for debugging
  if (!messages[code]) {
    console.warn('[Auth Error]', 'Code:', code, 'Message:', error?.message, 'Full:', JSON.stringify(error));
  }

  return { code, message: messages[code] ?? `Đã có lỗi xảy ra (${code}). Vui lòng thử lại.` };
}

