import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isProcessing = false;
  private readonly MAX_RETRIES = 5;

  constructor(private readonly prisma: PrismaClient) {
    // Polling interval bounds
    setInterval(() => this.pollQueue(), 2000);
  }

  async pollQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events: any[] = await this.prisma.$queryRaw`
        UPDATE "OutboxEvent"
        SET status = 'PROCESSING'
        WHERE id IN (
          SELECT id FROM "OutboxEvent"
          WHERE status IN ('PENDING', 'FAILED')
            AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
          ORDER BY "createdAt" ASC
          LIMIT 25
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `;

      // Parallel resilient resolution executing fully outside the Database Transaction bounds to protect conn pool
      await Promise.allSettled(events.map(async (event) => {
        try {
          // Process event (assuming mocked success for illustration: Route to appropriate service)
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: 'COMPLETED' },
          });
        } catch (e: any) {
          const nextRetryCount = event.retryCount + 1;
          
          if (nextRetryCount > this.MAX_RETRIES) {
            this.logger.error(`Event ${event.id} permanently breached reliability bounds. Routing to DLQ.`);
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'DLQ', retryCount: nextRetryCount, lastErrorMessage: e.message }
            });
          } else {
            // Formula: exponential timing throttle (2,4,8,16 mins mapping)
            const delay = Math.pow(2, nextRetryCount);
            const nextAttemptAt = new Date(Date.now() + delay * 60000);
            
            await this.prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'FAILED', retryCount: nextRetryCount, nextAttemptAt, lastErrorMessage: e.message }
            });
          }
        }
      }));
    } catch (e) {
      this.logger.error('CRITICAL outbox framework error loop crash: ', e);
    } finally {
      this.isProcessing = false;
    }
  }
}
