import {
  collection,
  getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, Unsubscribe,
  query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, Reward, CollectionPoint } from '../types/models';
import { ok, err, Result } from '../types/result';

// ─── Transaction Service ──────────────────────────────────────────────────────

export const TransactionService = {
  subscribeToTransactions(
    userId: string,
    callback: (transactions: Transaction[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() ?? new Date(),
      })) as Transaction[];
      
      // Client-side sort to avoid composite index requirement
      txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(txs.slice(0, 20));
    });
  },
};

// ─── Rewards Service ──────────────────────────────────────────────────────────

export const RewardService = {
  async getRewards(): Promise<Result<Reward[]>> {
    try {
      // Avoid composite index requirement: fetch all rewards and filter/sort client-side
      const snap = await getDocs(collection(db, 'rewards'));
      const rewards = snap.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          expiresAt: doc.data().expiresAt?.toDate?.() ?? new Date(),
        }))
        .filter((r: any) => r.isActive === true)
        .sort((a: any, b: any) => a.pointsRequired - b.pointsRequired) as Reward[];
      return ok(rewards);
    } catch (e: any) {
      return err('firestore-error', 'Không thể tải danh sách phần thưởng.');
    }
  },

  async redeemReward(userId: string, reward: Reward): Promise<Result<void>> {
    try {
      // Log redemption transaction with explicit COMPLETED status
      // This is critical: without status, useEcoPoints() breaks
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'REDEEM',
        amount: reward.pointsRequired,
        description: `Đổi: ${reward.title}`,
        rewardId: reward.id,
        status: 'COMPLETED',
        createdAt: serverTimestamp(),
      });
      return ok(undefined);
    } catch (e: any) {
      return err('redemption-failed', 'Đổi quà thất bại. Vui lòng thử lại.');
    }
  },
};

// ─── Collection Points Service ────────────────────────────────────────────────

export const CollectionPointService = {
  async getCollectionPoints(): Promise<Result<CollectionPoint[]>> {
    try {
      const snap = await getDocs(collection(db, 'collection_points'));
      const points = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CollectionPoint[];
      return ok(points);
    } catch (e: any) {
      return err('firestore-error', 'Không thể tải điểm thu gom.');
    }
  },
};
