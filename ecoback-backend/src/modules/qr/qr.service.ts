import { Injectable, BadRequestException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CryptoUtils } from '../../common/security/crypto.utils';

@Injectable()
export class QrService {
  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    @Inject('REDIS') private readonly redisClient: any,
  ) {}

  async redeemQRCode(qrId: string, userId: string, dto: any): Promise<any> {
    const lockKey = `ecoback:lock:qr:${qrId}`;
    const velocityKey = `ecoback:fraud:velocity:${userId}`;

    // 1. BEHAVIORAL FRAUD & FAIL-OPEN REDIS LOCK
    try {
      const scans = await this.redisClient.incr(velocityKey);
      if (scans === 1) await this.redisClient.expire(velocityKey, 60);
      if (scans > 5) throw new ForbiddenException('Velocity limit exceeded (Max 5/min).');

      const acquired = await this.redisClient.set(lockKey, '1', 'PX', 30000, 'NX');
      if (!acquired) throw new ConflictException('Concurrent request blocked by cache');
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof ConflictException) throw err;
      console.warn(`Redis failed, allowing fail-open: ${err}`);
    }

    // 2. TRANSACTION ACID EXECUTION
    return this.prisma.$transaction(async (tx: any) => {

      // A. Idempotency Gate
      const existingKey = await tx.idempotencyKey.findUnique({
        where: { key_userId: { key: dto.idempotencyKey, userId } },
      });
      if (existingKey) {
        if (existingKey.status === 'COMPLETED') return existingKey.responsePayload;
        throw new ConflictException('Processing in progress');
      }
      await tx.idempotencyKey.create({
        data: { key: dto.idempotencyKey, userId, endpoint: 'POST /qrs/redeem', status: 'PROCESSING' },
      });

      // B. Pessimistic Lock & Sanity Verification
      const qrRows: any[] = await tx.$queryRaw`
        SELECT qr.*, batch.status AS "batchStatus"
        FROM "QRCode" qr
        INNER JOIN "QRBatch" batch on qr."batchId" = batch.id
        WHERE qr.id = ${qrId}::uuid
        FOR UPDATE
      `;
      if (!qrRows || qrRows.length === 0) throw new BadRequestException('QR not found');
      const qrRecord = qrRows[0];

      if (qrRecord.batchStatus === 'DISABLED') throw new ForbiddenException('Batch kill-switch is active');
      if (qrRecord.status !== 'PENDING') throw new BadRequestException('QR already consumed');

      // C. HMAC Verification
      const isValid = CryptoUtils.verifySignature(qrRecord.id, qrRecord.businessId, qrRecord.keyVersion, dto.signature);
      if (!isValid) throw new ForbiddenException('Cryptographic mismatch');

      // D. Mutations
      const pointsToAward = BigInt(10);
      await tx.qRCode.update({
        where: { id: qrId },
        data: { status: 'CONSUMED', consumerId: userId, scannedAt: new Date() },
      });
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { balanceEcoPoints: { increment: pointsToAward } },
      });

      // E. Transactional Outbox
      await tx.outboxEvent.create({
        data: {
          eventType: 'ESG_QR_CONSUMED',
          payload: { qrId, businessId: qrRecord.businessId, userId },
          status: 'PENDING',
        },
      });

      const successResponse = {
        status: 'SUCCESS',
        earnedPoints: pointsToAward.toString(),
        newBalance: wallet.balanceEcoPoints.toString(),
      };

      // F. Finalize Idempotency
      await tx.idempotencyKey.update({
        where: { key_userId: { key: dto.idempotencyKey, userId } },
        data: { status: 'COMPLETED', responsePayload: successResponse },
      });

      return successResponse;
    });
  }
}
