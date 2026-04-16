/**
 * QR Code Redemption Service
 * Calls the EcoBack backend API to redeem a scanned QR code.
 * Falls back to Firestore-only mode if backend is unreachable.
 */
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Result, ok, err } from '../types/result';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const REQUEST_TIMEOUT_MS = 8000;

interface RedeemResult {
  pointsEarned: number;
  transactionId: string;
  qrId: string;
  recycleCount?: number;
}

/**
 * Attempt to redeem a QR code.
 * First tries the backend REST API, falls back to Firestore if backend is down.
 */
export async function redeemQRCode(
  qrData: string,
  userId: string
): Promise<Result<RedeemResult>> {
  if (!userId) {
    return err('unauthenticated', 'Bạn cần đăng nhập để quét mã QR.');
  }

  // Try backend REST API first (production path)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${BACKEND_URL}/api/qr/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode: qrData, userId }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const json = await response.json();

    if (response.status === 200 && json.success) {
      return ok({
        pointsEarned: json.data.pointsEarned ?? json.data.points ?? 0,
        transactionId: json.data.transactionId ?? '',
        qrId: json.data.qrId ?? qrData,
        recycleCount: json.data.recycleCount ?? 1,
      });
    }

    if (response.status === 409 || json.code === 'already_used') {
      return err('already_used', 'Mã QR này đã được sử dụng trước đó.');
    }

    return err(json.code ?? 'api-error', json.message ?? 'Lỗi từ server. Vui lòng thử lại.');
  } catch (fetchError: any) {
    // Backend unreachable — fall through to Firestore fallback
    if (fetchError?.name !== 'AbortError') {
      console.warn('[QR] Backend unreachable, using Firestore fallback:', fetchError?.message);
    }
  }

  // ── Firestore Fallback (when backend is down) ──────────────────────────────
  return redeemQRCodeFirestore(qrData, userId);
}

/**
 * Firestore-based QR redemption (fallback when backend unavailable).
 * Reads QR doc, checks status, awards points, writes transaction — all in one atomic transaction.
 */
async function redeemQRCodeFirestore(
  qrData: string,
  userId: string
): Promise<Result<RedeemResult>> {
  try {
    // QR codes stored as {code: qrData} or by document ID = qrData
    const qrRef = doc(db, 'qr_codes', qrData);

    let pointsEarned = 0;
    let transactionId = '';
    let updatedRecycleCount = 0;
    let userName = 'Người dùng';

    await runTransaction(db, async (txn) => {
      // 1. ALL READS FIRST
      const qrSnap = await txn.get(qrRef);
      const userRef = doc(db, 'users', userId);
      const userSnap = await txn.get(userRef);

      if (!qrSnap.exists()) {
        throw { code: 'not-found', message: 'Mã QR không tồn tại trong hệ thống.' };
      }

      const qrDoc = qrSnap.data();

      if (qrDoc.status === 'CONSUMED') {
        throw { code: 'already_used', message: 'Mã QR này đã được sử dụng trước đó.' };
      }

      if (qrDoc.status === 'EXPIRED') {
        throw { code: 'expired', message: 'Mã QR này đã hết hạn.' };
      }

      pointsEarned = qrDoc.pointsValue ? Number(qrDoc.pointsValue) : 10;
      const currentRecycleCount = Number(qrDoc.recycleCount) || 0;
      updatedRecycleCount = currentRecycleCount + 1;

      if (userSnap.exists()) {
        userName = userSnap.data().displayName || userSnap.data().email || 'Người dùng';
      }

      // 2. ALL WRITES AFTER READS
      // Mark QR as consumed
      txn.update(qrRef, {
        status: 'CONSUMED',
        consumedBy: userId,
        consumedAt: serverTimestamp(),
        recycleCount: updatedRecycleCount,
      });

      // pointsEarned and other info is used for the transaction doc below
      // We don't increment user points here to allow for the 3-5' validation check
    });

    // Write transaction log (outside atomic txn for simplicity)
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);

    const txRef = await addDoc(collection(db, 'transactions'), {
      userId,
      userName, // Add userName for easier tracking
      type: 'EARN',
      amount: pointsEarned,
      description: `Thu gom rác - Quét bởi ${userName}`,
      qrId: qrData,
      status: 'PROCESSING', // Changed to PROCESSING for validation period
      createdAt: serverTimestamp(),
      expireAt: expireDate
    });
    transactionId = txRef.id;

    return ok({ pointsEarned, transactionId, qrId: qrData, recycleCount: updatedRecycleCount });
  } catch (e: any) {
    if (e?.code === 'already_used') {
      return err('already_used', e.message);
    }
    if (e?.code === 'not-found') {
      return err('not-found', e.message);
    }
    if (e?.code === 'expired') {
      return err('expired', e.message);
    }
    console.error('[QR Firestore fallback] Error:', e);
    return err('firestore-error', 'Không thể xử lý mã QR. Vui lòng thử lại.');
  }
}
