import { config } from 'dotenv';
import { join, extname } from 'path';

// Load .env file immediately with explicit path
const envPath = join(process.cwd(), '.env');
const result = config({ path: envPath });

if (result.error) {
  console.error(
    `[CRITICAL] Failed to load .env file from ${envPath}: ${result.error.message}`,
  );
  console.error(`[CRITICAL] Current working directory: ${process.cwd()}`);
  process.exit(1);
}

// Verify critical env vars are loaded before proceeding
if (!process.env.DB_HOST || !process.env.DB_USERNAME) {
  console.error('[CRITICAL] Environment variables not loaded properly.');
  console.error(`[CRITICAL] DB_HOST: ${process.env.DB_HOST || 'MISSING'}`);
  console.error(
    `[CRITICAL] DB_USERNAME: ${process.env.DB_USERNAME ? 'SET' : 'MISSING'}`,
  );
  console.error(`[CRITICAL] .env file path: ${envPath}`);
  console.error(`[CRITICAL] Current working directory: ${process.cwd()}`);
  process.exit(1);
}

// Now import NestJS modules (they will have access to env vars)
import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
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

  // Configure trust proxy for accurate IP extraction behind proxies/load balancers
  app.set('trust proxy', true);
  logger.log('Trust proxy enabled for accurate IP extraction');

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

  // Enable CORS with credentials support for cookies
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  logger.log('CORS enabled with credentials support');

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

  // Register downloads route before global prefix (public route)
  // This must be done before setGlobalPrefix to ensure it's not affected by the prefix
  expressApp.get('/downloads', (req: any, res: any) => {
    const htmlPath = join(__dirname, '..', 'public', 'ui', 'index.html');
    return res.sendFile(htmlPath);
  });
  logger.log('Downloads route registered at /downloads');

  // Register reset-password route before global prefix (public route)
  expressApp.get('/reset-password', (req: any, res: any) => {
    const htmlPath = join(__dirname, '..', 'public', 'ui', 'index.html');
    return res.sendFile(htmlPath);
  });
  logger.log('Reset password route registered at /reset-password');

  // Admin SPA fallback (serve React index for deep links)
  const adminIndexPath = join(__dirname, '..', 'public', 'admin', 'index.html');
  expressApp.get('/admin', (req: any, res: any) => {
    return res.sendFile(adminIndexPath);
  });
  expressApp.get('/admin/*path', (req: any, res: any, next: any) => {
    if (extname(req.path)) {
      return next();
    }
    return res.sendFile(adminIndexPath);
  });
  logger.log('Admin SPA fallback registered for /admin');

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
  app.setGlobalPrefix('api', { exclude: ['downloads', 'reset-password'] });
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
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Admin dashboard available at: http://localhost:${port}/admin/`);

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
