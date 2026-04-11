import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { mapFirebaseError, ok, err, Result } from '../types/result';
import { UserProfile } from '../types/models';

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {
  async login(email: string, password: string): Promise<Result<User>> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return ok(credential.user);
    } catch (e: any) {
      console.warn('[Login] Auth error:', e?.code, e?.message);
      return { success: false, error: mapFirebaseError(e) };
    }
  },

  async register(email: string, password: string, displayName: string): Promise<Result<User>> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Update Firebase display name
      await updateProfile(user, { displayName });

      // Create Firestore profile document (non-blocking for auth success)
      try {
        // Gán quyền gián tiếp qua Code: Kiểm tra email đăng ký
        const isAdmin = email === 'admin@ecoback.vn' || email.endsWith('@ecoback-admin.vn');
        const assignedRole = isAdmin ? 'ADMIN' : 'USER';

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email,
          displayName,
          role: assignedRole,
          photoURL: null,
          phone: null,
          address: null,
          ecoPoints: 0,
          totalRecycled: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (firestoreError: any) {
        // Log but don't fail - user was created in Auth successfully
        console.warn('[Register] Firestore profile creation failed:', firestoreError?.message);
      }

      return ok(user);
    } catch (e: any) {
      console.warn('[Register] Auth error:', e?.code, e?.message);
      return { success: false, error: mapFirebaseError(e) };
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async forgotPassword(email: string): Promise<Result<void>> {
    try {
      await sendPasswordResetEmail(auth, email);
      return ok(undefined);
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) };
    }
  },

  getCurrentUser(): User | null {
    return auth.currentUser;
  },
};

// ─── User Profile Service ─────────────────────────────────────────────────────

export const UserService = {
  async getProfile(uid: string): Promise<Result<UserProfile>> {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return err('not-found', 'Không tìm thấy thông tin người dùng.');
      }
      const data = snap.data();
      return ok({
        ...data,
        uid,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      } as UserProfile);
    } catch (e: any) {
      return err('firestore-error', 'Lỗi khi tải thông tin người dùng.');
    }
  },
};
