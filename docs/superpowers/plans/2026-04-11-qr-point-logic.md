# Lazy-Evaluated QR Point Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the QR scan system to record 'PROCESSING' transactions with a 7-day expiration instead of instantly assigning points, and update Admin Dashboard Analytics/Views to reflect these new schemas dynamically using Lazy Evaluation.

**Architecture:** We are creating a `TransactionService` implementation that validates and mutates stale `PROCESSING` transactions to `EXPIRED`. This service is mapped around the Admin Dashboard and User hooks so stale data corrects itself without needing an explicit cron job. Additionally, the Admin UI updates implement dynamic visualization matching exactly standard logic maps.

**Tech Stack:** React Native, Expo, Firebase Firestore, TypeScript.

---

### Task 1: Create Transaction Evaluation Service

**Files:**
- Create: `src/services/transaction.service.ts`

- [ ] **Step 1: Write Lazy Evaluation logic**

```typescript
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
```

- [ ] **Step 2: Commit Task 1**
```bash
git add src/services/transaction.service.ts
git commit -m "feat: Add lazy evaluation logic for Transactions"
```

### Task 2: Refactor QR Scan Service

**Files:**
- Modify: `src/services/qr.service.ts` (Requires understanding the creation flow)

- [ ] **Step 1: Refactor `redeemQRCode` to generate `PROCESSING` with expiration**

```typescript
// Look for where a transaction is created inside qr.service.ts / redeemQRCode
// We need to add the expireAt date and status fields.

const expireDate = new Date();
expireDate.setDate(expireDate.getDate() + 7);

const transactionData = {
  id: transactionRef.id,
  userId: userId,
  type: 'EARN',
  amount: 0, // IMPORTANT: Points are 0 until approved!
  description: `Quét mã QR thu gom chờ xử lý`,
  qrId: qrCodeId,
  status: 'PROCESSING',
  createdAt: Timestamp.now(),     // Must use Firestore Timestamp
  expireAt: Timestamp.fromDate(expireDate)
};
```

- [ ] **Step 2: Commit Task 2**
```bash
git add src/services/qr.service.ts
git commit -m "refactor: Ensure QR Scans yield PROCESSING transaction with 7 day expiry"
```

### Task 3: Update Admin UI & User History Layouts (Colors & Lazy Eval)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `app/(admin)/history.tsx`

- [ ] **Step 1: Update `HomeScreen.tsx` layout colors to match architecture specifications**

```tsx
import { TransactionService } from '../services/transaction.service';

// Inside your map iteration:
const resolvedTx = TransactionService.evaluateTransaction(tx);
const isPending = resolvedTx.status === 'PROCESSING';
const isApproved = resolvedTx.status === 'APPROVED';
const isExpired = resolvedTx.status === 'EXPIRED' || resolvedTx.status === 'CANCELLED';

// In Icon mapping rendering:
const iconBgColor = isApproved ? Colors.successSurface : isPending ? '#FFF9C4' : Colors.errorSurface;
const iconColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;
const amountColor = isApproved ? Colors.success : isPending ? '#FBC02D' : Colors.error;

// Expired uses textDecorationLine
<Text style={[styles.txAmount, { color: amountColor, textDecorationLine: isExpired ? 'line-through' : 'none' }]}>
```

- [ ] **Step 2: Apply the identical logic into `app/(admin)/history.tsx`**
Ensure history views loop through `TransactionService.evaluateTransaction(item)` instead of raw `item`!
Add the strict Vietnamese status visual strings: 🟢 Bình thường, 🟡 Đang xử lý, 🔴 Bị hủy.

- [ ] **Step 3: Commit Task 3**
```bash
git add src/screens/HomeScreen.tsx app/\(admin\)/history.tsx
git commit -m "feat: Integrate Lazy Eval and Color palette UI into tracking systems"
```

### Task 4: Fix Admin Analytics (Refactor Dashboard Chart source)

**Files:**
- Modify: `app/(admin)/index.tsx`

- [ ] **Step 1: Rewrite Fetch logic on Admin Panel**

```typescript
// Replace the hardcoded/stubbed getDocs on collection_requests with true transactions logic!
// Goal: Fetch all transactions. Parse the evaluation. Count statuses to build Pie/Bar charts!

let totalKg = 0;
// Fetch transactions
const txSnap = await getDocs(collection(db, 'transactions'));
txSnap.forEach(doc => {
   const rawTx = doc.data() as Transaction;
   const parsedTx = TransactionService.evaluateTransaction(rawTx); // Trigger Lazy Eval Check

   if (parsedTx.status === 'APPROVED' && parsedTx.kg) {
      totalKg += parsedTx.kg;
   }
});

setStats({
   ...stats,
   totalRecycled: totalKg,
   co2Saved: totalKg * 2.5
});
```

- [ ] **Step 2: Commit Task 4**
```bash
git add app/\(admin\)/index.tsx
git commit -m "feat: Update Admin Analytics to read Lazy Evaluated transactions safely"
```
