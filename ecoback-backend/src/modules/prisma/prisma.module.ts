import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const PrismaProvider = {
  provide: 'PRISMA',
  useFactory: async () => {
    const prisma = new PrismaClient();
    await prisma.$connect();
    return prisma;
  },
};

@Global()
@Module({
  providers: [PrismaProvider],
  exports: [PrismaProvider],
})
export class PrismaModule {}
