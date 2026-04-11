import * as crypto from 'crypto';

export class CryptoUtils {
  static getSecretForKeyVersion(version: number): string {
    // In production, this maps exactly to an env variable or AWS Secrets payload.
    const secrets = { 1: 'super_secret_v1', 2: 'super_secret_v2' };
    const secret = secrets[version as keyof typeof secrets];
    if (!secret) throw new Error('Invalid key version configuration');
    return secret;
  }

  static generateHmac(qrId: string, businessId: string, secretKey: string): string {
    const payload = `${qrId}:${businessId}`;
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  static verifySignature(qrId: string, businessId: string, version: number, providedSignature: string): boolean {
    try {
      const secret = this.getSecretForKeyVersion(version);
      const expected = this.generateHmac(qrId, businessId, secret);
      
      const expectedBuffer = Buffer.from(expected, 'hex');
      const providedBuffer = Buffer.from(providedSignature, 'hex');
      
      if (expectedBuffer.length !== providedBuffer.length) return false;
      return crypto.timingSafeEqual(expectedBuffer, providedBuffer); // mathematically zero-leak check
    } catch {
      return false; // Safely absorb misconfigurations or brute-force invalid lengths
    }
  }
}
