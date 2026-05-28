import { config } from 'dotenv';
import { join } from 'path';

// Load .env file if present; in production, env vars are injected by the runtime
const envPath = join(process.cwd(), '.env');
const result = config({ path: envPath });

if (result.error) {
  const isFileNotFound =
    (result.error as NodeJS.ErrnoException).code === 'ENOENT';
  if (isFileNotFound) {
    console.warn(
      `[WARN] No .env file found at ${envPath} — expecting env vars from the runtime environment`,
    );
  } else {
    console.error(
      `[CRITICAL] Failed to parse .env file at ${envPath}: ${result.error.message}`,
    );
    process.exit(1);
  }
}

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USERNAME', 'PORT'] as const;
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[CRITICAL] Missing required environment variables: ${missing.join(', ')}`,
  );
  console.error(`[CRITICAL] Current working directory: ${process.cwd()}`);
  process.exit(1);
}

// Now import NestJS modules (they will have access to env vars)
import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  BadRequestException,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { EnvValidationService } from './config/env-validation.service';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables
  const envValidation = new EnvValidationService();
  try {
    envValidation.validate();
  } catch (error) {
    logger.error('Environment validation failed. Application cannot start.');
    logger.error(error.message);
    process.exit(1);
  }

  // Log confirmation that env vars are loaded
  logger.log(
    `Environment variables loaded successfully (DB_HOST: ${process.env.DB_HOST})`,
  );

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Security headers. `crossOriginResourcePolicy: 'cross-origin'` is required
  // because this server also serves static assets (avatars, .well-known) that
  // the web + mobile apps load from their own origins — Helmet's default
  // `same-origin` CORP would block those cross-origin reads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  logger.log('Helmet security headers enabled');

  // Trust exactly one proxy hop in front of Node (nginx in prod, Next.js dev
  // server in local dev). If the topology changes (e.g., a managed load
  // balancer is added in front of nginx), bump this to match the new hop count
  // — too low fails loudly (everyone shares one rate-limit bucket), too high
  // silently re-enables X-Forwarded-For spoofing.
  app.set('trust proxy', 1);
  logger.log('Trust proxy set to 1 hop');

  // Get Express instance for direct route configuration
  const expressApp = app.getHttpAdapter().getInstance();

  // Configure raw body preservation for Stripe webhook endpoint
  // This must be done before any body parsing middleware
  // Stripe requires the raw body (as Buffer) to verify webhook signatures
  expressApp.use(
    '/api/v1/stripe/webhook',
    express.raw({ type: 'application/json' }),
  );
  logger.log('Raw body middleware configured for Stripe webhook endpoint');

  // Register global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.log('Global exception filter registered');

  // Strip @Exclude()-marked fields (e.g. User.password) from every response.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  logger.log('Global ClassSerializerInterceptor registered');

  // Register cookie parser middleware
  app.use(cookieParser());
  logger.log('Cookie parser middleware registered');

  // Register request logging middleware
  app.use(
    new RequestLoggerMiddleware().use.bind(new RequestLoggerMiddleware()),
  );
  logger.log('Request logging middleware registered');

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  // Enable CORS with credentials support for cookies.
  // CORS_ORIGINS is required at boot (validated in EnvValidationService).
  const corsOrigins = process.env
    .CORS_ORIGINS!.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  logger.log(`CORS enabled (origins: ${corsOrigins.join(', ')})`);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        logger.warn(`Validation failed: ${JSON.stringify(errors)}`);
        return new BadRequestException(errors);
      },
    }),
  );

  // SPA fallback routes removed — /downloads, /reset-password, /admin
  // are now served by the apps/web Next.js server.

  // Serve .well-known files for mobile deep linking (App Links / Universal Links)
  // These files must be served with correct content-type for iOS/Android verification
  expressApp.get('/.well-known/assetlinks.json', (req: any, res: any) => {
    const filePath = join(
      __dirname,
      '..',
      'public',
      '.well-known',
      'assetlinks.json',
    );
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(filePath);
  });

  expressApp.get(
    '/.well-known/apple-app-site-association',
    (req: any, res: any) => {
      const filePath = join(
        __dirname,
        '..',
        'public',
        '.well-known',
        'apple-app-site-association',
      );
      res.setHeader('Content-Type', 'application/json');
      return res.sendFile(filePath);
    },
  );
  logger.log(
    'Deep linking .well-known files registered for App Links / Universal Links',
  );

  // API versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('BaltazarTV API')
      .setDescription('--')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    logger.log('Swagger documentation available at /api');
  }

  const port = process.env.PORT;
  if (!port) {
    logger.error('PORT environment variable is required');
    process.exit(1);
  }
  await app.listen(port);
  logger.log(`API server running on: http://localhost:${port}`);

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);

    try {
      const dataSource = app.get(DataSource);
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
        logger.log('Database connection closed successfully');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Connection might not exist or already closed, which is fine
      logger.debug(`Database connection close result: ${message}`);
    }

    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error(`Error closing application: ${error.message}`);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`, error.stack);
    gracefulShutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    gracefulShutdown('unhandledRejection');
  });
}
bootstrap();
