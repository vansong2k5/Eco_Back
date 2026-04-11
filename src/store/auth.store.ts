import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthService, UserService } from '../services/auth.service';
import { UserProfile } from '../types/models';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
  setProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ user, isInitialized: true });

      if (user) {
        const result = await UserService.getProfile(user.uid);
        const isAdminEmail = user.email === 'admin@ecoback.vn' || user.email?.endsWith('@ecoback-admin.vn');

        if (result.success) {
          const profileData = result.data;
          // Tự động vá (patch) Role nếu DB cũ chưa có
          if (isAdminEmail && profileData.role !== 'ADMIN') {
             profileData.role = 'ADMIN';
          }
          set({ profile: profileData });
        } else {
          // Bắt buộc fallback để không bị kẹt màn hình xanh Loading
          set({ profile: { 
            uid: user.uid, 
            email: user.email || '', 
            displayName: user.displayName || 'Người dùng', 
            role: isAdminEmail ? 'ADMIN' : 'USER', 
            ecoPoints: 0, 
            totalRecycled: 0, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          } });
        }
      } else {
        set({ profile: null });
      }
    });

    return unsubscribe;
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await AuthService.login(email, password);
    set({ isLoading: false });

    if (!result.success) {
      set({ error: result.error.message });
      return false;
    }
    return true;
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    const result = await AuthService.register(email, password, displayName);
    set({ isLoading: false });

    if (!result.success) {
      set({ error: result.error.message });
      return false;
    }
    return true;
  },

  logout: async () => {
    set({ isLoading: true });
    await AuthService.logout();
    set({ user: null, profile: null, isLoading: false, error: null });
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    const result = await AuthService.forgotPassword(email);
    set({ isLoading: false });

    if (!result.success) {
      set({ error: result.error.message });
      return false;
    }
    return true;
  },

  clearError: () => set({ error: null }),
  setProfile: (profile) => set({ profile }),
}));
