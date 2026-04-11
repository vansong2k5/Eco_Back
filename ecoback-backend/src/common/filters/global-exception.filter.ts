import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { traceId?: string }>();
    const traceId = request.traceId || 'anonymous_trace';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Dedicated Server Error';

    // Standard mappings
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    // Always structure error output context for tools like DataDog
    this.logger.error(JSON.stringify({ 
      event: 'GLOBAL_CRITICAL_CATCH', 
      traceId, 
      method: request.method,
      url: request.url,
      stack: exception.stack?.toString() 
    }));

    // Mask true failures
    response.status(status).json({
      success: false,
      traceId,
      error: { message },
      timestamp: new Date().toISOString()
    });
  }
}
