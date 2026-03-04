import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private store: RateLimitStore = {};
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly cleanupInterval: number;

  constructor() {
    // Configurable via environment variables (Fallback increased to prevent 429 on normal load)
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '3000', 10);
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes default
    this.cleanupInterval = parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL || '600000', 10); // 10 minutes

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();
    const record = this.store[key];

    // Initialize or reset if window expired
    if (!record || record.resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.setHeaders(res, this.maxRequests, 1, this.windowMs);
      return next();
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > this.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      this.setHeaders(res, this.maxRequests, record.count, record.resetTime - now);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.setHeaders(res, this.maxRequests, record.count, record.resetTime - now);
    next();
  }

  private getKey(req: Request): string {
    // Use IP address and user ID if available
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    
    // Different limits for authenticated vs anonymous users
    return userId !== 'anonymous' ? `user:${userId}` : `ip:${ip}`;
  }

  private setHeaders(res: Response, limit: number, remaining: number, resetIn: number) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - remaining).toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + resetIn).toISOString());
    res.setHeader('Retry-After', Math.ceil(resetIn / 1000).toString());
  }

  private cleanup() {
    const now = Date.now();
    const keys = Object.keys(this.store);
    let cleaned = 0;

    for (const key of keys) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}
