import { PrismaClient } from '@prisma/client';
import { CryptoUtils } from '../src/common/security/crypto.utils';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Commencing Database Seed Injection...');

  const userId = crypto.randomUUID();
  const businessId = crypto.randomUUID();
  const batchId = crypto.randomUUID();
  
  // A specific UUID we will test against reliably.
  const qrId = '11112222-3333-4444-5555-666677778888';
  const keyVersion = 1;

  await prisma.user.create({
    data: {
      id: userId,
      firebaseUid: `mock_firebase_${Date.now()}`,
      wallet: { create: { balanceEcoPoints: 0 } }
    }
  });

  await prisma.business.create({
    data: {
      id: businessId,
      name: 'Eco Corp Demo',
      taxId: `TX_${Date.now()}`,
    }
  });

  await prisma.qRBatch.create({
    data: {
      id: batchId,
      businessId: businessId,
      status: 'ENABLED'
    }
  });

  // Mathematically hash the static payload.
  const secretKey = CryptoUtils.getSecretForKeyVersion(keyVersion);
  const signature = CryptoUtils.generateHmac(qrId, businessId, secretKey);

  await prisma.qRCode.create({
    data: {
      id: qrId,
      batchId: batchId,
      signature,
      keyVersion,
      status: 'PENDING'
    }
  });

  console.log('\n=============================================');
  console.log('✅ Seed Complete. Use these Test Values:');
  console.log(`URL/Endpoint Payload -> POST /qrs/${qrId}/redeem`);
  console.log('Body:');
  console.log(JSON.stringify({
    idempotencyKey: crypto.randomUUID(),
    signature,
    businessId,
    keyVersion
  }, null, 2));
  console.log(`Simulated User Bearer context maps to userId: ${userId}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
