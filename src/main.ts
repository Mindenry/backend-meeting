import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { setupSwagger } from './config/swagger.config';
import * as express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new TimeoutInterceptor(),
  );

  // Global validation pipe with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Disable detailed errors in production
      validationError: {
        target: false, // Don't expose target object
        value: false, // Don't expose value
      },
    }),
  );

  // Enhanced CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? [] // Must be set in production
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://127.0.0.1:8080',
        ]; // Development defaults

  // Add ngrok domain if provided
  const ngrokDomain = process.env.NGROK_DOMAIN;
  if (ngrokDomain) {
    allowedOrigins.push(`https://${ngrokDomain}`);
    allowedOrigins.push(`http://${ngrokDomain}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.) in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // In development, allow all localhost origins for convenience
      if (process.env.NODE_ENV !== 'production' && origin) {
        const isLocalhost =
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('https://localhost:') ||
          origin.startsWith('https://127.0.0.1:');

        if (isLocalhost) {
          return callback(null, true);
        }
      }

      // Allow ngrok domains
      if (
        origin &&
        (origin.includes('.ngrok-free.app') ||
          origin.includes('.ngrok.io') ||
          origin.includes('.ngrok.app'))
      ) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });

  // Security headers
  app.use((req, res, next) => {
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Detect ngrok domain for relaxed CSP
    const isNgrok =
      req.headers.host?.includes('ngrok') ||
      req.headers.origin?.includes('ngrok');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // IMPORTANT: ถอน X-Frame-Options ออกเพื่อให้ iframe ทำงานได้ (เช่น PDF preview)
    res.removeHeader('X-Frame-Options');

    // Content Security Policy (relaxed for ngrok)
    const cspDirectives = isNgrok
      ? [
          "default-src 'self' https://*.ngrok-free.app https://*.ngrok.io https://*.ngrok.app https://*.ngrok-free.dev",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          "media-src 'self' blob: https: http:",
          "frame-src 'self' blob: https: http:",
          "child-src 'self' blob: https: http:",
          "connect-src 'self' https://*.ngrok-free.app https://*.ngrok.io https://*.ngrok.app https://*.ngrok-free.dev ws://*.ngrok-free.app wss://*.ngrok-free.app ws://*.ngrok.io wss://*.ngrok.io ws://*.ngrok-free.dev wss://*.ngrok-free.dev",
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https: http:",
          "media-src 'self' blob: https: http:",
          "frame-src 'self' blob: https: http:",
          "child-src 'self' blob: https: http:",
          "connect-src 'self' ws://localhost:7880 wss://localhost:7880 ws: wss: http: https:",
        ].join('; ');
    res.setHeader('Content-Security-Policy', cspDirectives);

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Allow ngrok browser warning bypass
    if (isNgrok) {
      res.setHeader('ngrok-skip-browser-warning', 'true');
    }

    // Log all requests reaching the backend (for debugging)
    if (req.originalUrl.startsWith('/uploads')) {
      logger.debug(
        `[DEBUG] Static File Request: ${req.method} ${req.originalUrl} - Host: ${req.headers.host}`,
      );
    }

    next();
  });

  // Increase body size limit for file uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Add LiveKit proxy here
  const livekitBaseTarget = (() => {
    const raw = process.env.LIVEKIT_URL?.trim();
    if (!raw) return 'http://127.0.0.1:7880';

    // LIVEKIT_URL may be ws://, wss://, http:// or https://
    if (raw.startsWith('ws://')) return raw.replace('ws://', 'http://');
    if (raw.startsWith('wss://')) return raw.replace('wss://', 'https://');
    return raw;
  })();

  const livekitProxy = createProxyMiddleware({
    target: livekitBaseTarget,
    changeOrigin: true,
    ws: true,
  });
  app.use('/rtc', livekitProxy);

  app.use(
    '/twirp',
    createProxyMiddleware({
      target: livekitBaseTarget,
      changeOrigin: true,
    }),
  );

  // Set global prefix for API routes (but exclude WebSocket)
  app.setGlobalPrefix('api', {
    exclude: ['socket.io'],
  });

  // Setup Swagger (only in development or if enabled)
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true'
  ) {
    try {
      setupSwagger(app);
      logger.log(
        `📚 Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
      );
    } catch (error) {
      logger.warn(
        'Swagger setup failed (packages may not be installed):',
        error.message,
      );
      logger.warn(
        'To enable Swagger, run: npm install @nestjs/swagger swagger-ui-express --legacy-peer-deps',
      );
    }
  }

  // Enable graceful shutdown hooks (Prisma disconnect, socket cleanup, etc.)
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Manually wire up WebSocket upgrade for LiveKit proxy
  // NestJS's app.use() doesn't auto-handle HTTP upgrade events
  const httpServer = app.getHttpServer();
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url?.startsWith('/rtc')) {
      (livekitProxy as any).upgrade(req, socket, head);
    }
  });

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  if (ngrokDomain) {
    logger.log(`🌐 Ngrok domain: https://${ngrokDomain}`);
  }

  if (process.env.NODE_ENV === 'production') {
    logger.log(
      `🔒 CORS enabled for: ${allowedOrigins.join(', ') || 'none (must configure ALLOWED_ORIGINS)'}`,
    );
  } else {
    logger.log(
      `🔒 CORS enabled for: localhost:* and ngrok domains (development mode)`,
    );
    if (allowedOrigins.length > 0) {
      logger.log(`   Also allowing: ${allowedOrigins.join(', ')}`);
    }
  }
}

bootstrap();
