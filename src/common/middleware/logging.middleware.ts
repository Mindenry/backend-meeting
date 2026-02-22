import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // Log request
    this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // Capture response finish
    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;
      const userId = (req as any).user?.id || 'anonymous';

      // Log response
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[logLevel](
        `${method} ${originalUrl} ${statusCode} - ${responseTime}ms - User: ${userId}`,
      );

      // Log slow requests
      if (responseTime > 1000) {
        this.logger.warn(`Slow request detected: ${method} ${originalUrl} took ${responseTime}ms`);
      }
    });

    next();
  }
}
