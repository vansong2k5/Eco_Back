import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction } from '../types/models';

export const TransactionService = {
  /**
   * Lazily evaluates a transaction. If it's PROCESSING and 7 days have passed,
   * it mutates it to EXPIRED and fires a non-blocking Firestore update.
   */
  evaluateTransaction(tx: Transaction): Transaction {
    if (tx.status === 'PROCESSING' && tx.expireAt) {
      const now = new Date();
      // Ensure we compare JS Dates correctly. If Firestore Timestamp, convert it.
      const expireDate = tx.expireAt instanceof Timestamp ? tx.expireAt.toDate() : new Date(tx.expireAt);
      
      if (now > expireDate) {
        // Mutate locally for instant UI update
        const updatedTx = { ...tx, status: 'EXPIRED' as const, ecoPoints: 0 };
        
        // Fire & Forget Update
        const txRef = doc(db, 'transactions', tx.id);
        updateDoc(txRef, { 
          status: 'EXPIRED',
          updatedAt: Timestamp.now()
        }).catch(err => console.warn('Failed lazy expire update:', err));
        
        return updatedTx;
      }
    }
    return tx;
  }
};
