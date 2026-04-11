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
