import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    
    // Inject globally identifiable trace markers seamlessly into header definitions
    const traceId = req.header('X-Request-Id') || `<internal>_${randomUUID()}`;
    req.traceId = traceId;
    res.setHeader('X-Request-Id', traceId);

    return next.handle();
  }
}
