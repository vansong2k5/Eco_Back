// Input validation utilities
export const Validators = {
  email: (email: string): string | null => {
    if (!email) return 'Email không được để trống.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Email không hợp lệ.';
    return null;
  },

  password: (password: string): string | null => {
    if (!password) return 'Mật khẩu không được để trống.';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    return null;
  },

  confirmPassword: (password: string, confirm: string): string | null => {
    if (!confirm) return 'Vui lòng xác nhận mật khẩu.';
    if (password !== confirm) return 'Mật khẩu không khớp.';
    return null;
  },

  required: (value: string, fieldName = 'Trường này'): string | null => {
    if (!value || !value.trim()) return `${fieldName} không được để trống.`;
    return null;
  },

  phone: (phone: string): string | null => {
    if (!phone) return 'Số điện thoại không được để trống.';
    const phoneRegex = /^(0|\+84)[3-9][0-9]{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'Số điện thoại không hợp lệ.';
    return null;
  },
};
