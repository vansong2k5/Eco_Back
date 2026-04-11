# 🖥️ Kiến trúc Backend - Xử lý Nhận Scan & Pessimistic Locking

Phần code này viết bằng **Node.js (NestJS) + Prisma + Redis** mô tả chính xác yêu cầu chống gian lận (Anti-fraud), kiểm tra GPS (< 50m) và khóa giao dịch chống Double-Scan.

## 1. Dịch vụ QR Scanner (`qr.service.ts`)

```typescript
import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';

@Injectable()
export class QrService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  /**
   * Tính khoảng cách giữa 2 toạ độ GPS bằng thuật toán Haversine (tính theo Mét)
   */
  private getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Bán kính Trái Đất theo mét
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  }

  /**
   * Xác thực HMAC Signature do Admin tạo ra để chống gian lận mã tĩnh
   */
  private verifyHMAC(qrId: string, timestamp: number, signature: string): boolean {
    const secret = process.env.QR_SECRET_KEY; // "super_secret_eco_key"
    const payload = `${qrId}|${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return expectedSig === signature;
  }

  /**
   * Hàm xử lý chính khi Mobile User gửi Request
   */
  async processScan(
    idToken: string, 
    qrId: string, 
    timestamp: number, 
    signature: string, 
    userLat: number, 
    userLng: number
  ) {
    // 1. Xác thực Firebase User từ Token bằng Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      throw new HttpException('Token không hợp lệ hoặc đã hết hạn', HttpStatus.UNAUTHORIZED);
    }
    const userId = decodedToken.uid;

    // 2. Chống Double-Scan bằng REDIS (Pessimistic Locking SetNX)
    const lockKey = `lock:scan:${qrId}`;
    const acquired = await this.redis.getClient().set(lockKey, 'locked', 'PX', 5000, 'NX');
    if (!acquired) {
      throw new BadRequestException('Hệ thống đang xử lý mã này, thao tác quá nhanh!');
    }

    try {
      // 3. Xác thực tính toàn vẹn (Signature)
      if (!this.verifyHMAC(qrId, timestamp, signature)) {
        throw new BadRequestException('Mã QR này được làm giả hoặc đã bị can thiệp!');
      }

      // Xử lý Transaction an toàn với ACID trên PostgreSQL
      return await this.prisma.$transaction(async (tx) => {
        // 4. Lấy dữ liệu mã QR từ DB và áp dụng Row-Level Lock để tránh Race Condition DB
        const qrCode = await tx.qrCode.findUnique({
          where: { id: qrId }
        });

        if (!qrCode) throw new BadRequestException('Mã QR không tồn tại.');
        if (qrCode.status === 'CONSUMED') throw new BadRequestException('Mã này đã được sử dụng!');
        if (qrCode.expirationDate < new Date()) throw new BadRequestException('Mã QR đã hết hạn.');

        // 5. Kiểm tra vị trí GPS với Trạm (Dung sai < 50 mét)
        const collectionPoint = await tx.collectionPoint.findUnique({
          where: { id: qrCode.pointId }
        });
        
        const distance = this.getDistanceInMeters(userLat, userLng, Number(collectionPoint.latitude), Number(collectionPoint.longitude));
        if (distance > 50) {
          throw new BadRequestException(`Bạn đang quá xa thùng rác! (${Math.round(distance)}m). Tính năng chống gian lận đã chặn giao dịch.`);
        }

        // 6. Cập nhật dữ liệu & Cộng điểm User
        await tx.qrCode.update({
          where: { id: qrId },
          data: { status: 'CONSUMED', scannedBy: userId, consumedAt: new Date() }
        });

        const newPoints = qrCode.pointsValue;

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { 
            ecoPoints: { increment: newPoints },
            totalRecycledAmount: { increment: 1 } 
          }
        });

        // 7. Lưu Transaction Lịch sử (Ledger)
        await tx.transaction.create({
          data: {
            userId,
            type: 'EARN_QR',
            amount: newPoints,
            description: `Tái chế thành công tại ${collectionPoint.name}`,
            qrId: qrId
          }
        });

        // 8. Tính tỉ lệ giảm phát thải mô phỏng (ESG CO2 = Điểm * 5g)
        const co2Saved = newPoints * 5;

        return {
          success: true,
          message: 'Tái chế thành công!',
          pointsEarned: newPoints,
          newBalance: updatedUser.ecoPoints,
          esgSaved: `${co2Saved}g CO2`,
          scanCount: collectionPoint.totalScans + 1
        };
      });

    } finally {
      // Nhả khoá Redis sau khi hoàn thành Transaction dù lỗi hay thành công
      await this.redis.getClient().del(lockKey);
    }
  }
}
```
