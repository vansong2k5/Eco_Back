import { create } from 'zustand';
import { Transaction, Reward, CollectionPoint } from '../types/models';
import { TransactionService, RewardService, CollectionPointService } from '../services/firestore.service';
import { Unsubscribe } from 'firebase/firestore';

interface AppState {
  transactions: Transaction[];
  rewards: Reward[];
  collectionPoints: CollectionPoint[];
  isLoadingRewards: boolean;
  isLoadingPoints: boolean;

  fetchRewards: () => Promise<void>;
  fetchCollectionPoints: () => Promise<void>;
  subscribeTransactions: (userId: string) => Unsubscribe;
}

export const useAppStore = create<AppState>((set) => ({
  transactions: [],
  rewards: [],
  collectionPoints: [],
  isLoadingRewards: false,
  isLoadingPoints: false,

  fetchRewards: async () => {
    set({ isLoadingRewards: true });
    const result = await RewardService.getRewards();
    if (result.success) {
      set({ rewards: result.data });
    }
    set({ isLoadingRewards: false });
  },

  fetchCollectionPoints: async () => {
    set({ isLoadingPoints: true });
    const result = await CollectionPointService.getCollectionPoints();
    if (result.success) {
      set({ collectionPoints: result.data });
    }
    set({ isLoadingPoints: false });
  },

  subscribeTransactions: (userId) => {
    return TransactionService.subscribeToTransactions(userId, (txs) => {
      set({ transactions: txs });
    });
  },
}));

// Export a custom hook to dynamically calculate user's EcoPoints from their transaction history
export const useEcoPoints = () => {
  const transactions = useAppStore(s => s.transactions);
  
  return transactions.reduce((total, tx) => {
    const isEarn = tx.type === 'EARN' || tx.type === 'ORDER';
    const isRedeem = tx.type === 'REDEEM';
    const status = tx.status;
    
    // Earned points: count if APPROVED, COMPLETED, or if status is missing (legacy QR scans)
    if (isEarn) {
      const isApproved = status === 'APPROVED' || status === 'COMPLETED' || !status;
      if (isApproved) {
        return total + (tx.amount || 0);
      }
    }
    
    // Redeemed points: deduct if COMPLETED, APPROVED, PROCESSING, PENDING, or missing status (legacy)
    // Only skip deduction for explicitly REJECTED, EXPIRED, or CANCELLED
    if (isRedeem) {
      const isRejected = status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED';
      if (!isRejected) {
        return total - (tx.amount || 0);
      }
    }
    
    return total;
  }, 0);
};
