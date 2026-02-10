import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AddressInfo } from 'net';
import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';

function configureApp(app: NestExpressApplication): void {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/api/v1/stripe/webhook',
    express.raw({ type: 'application/json' }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['downloads', 'reset-password'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
}

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    rawBody: true,
  });

  configureApp(app);
  await app.init();
  return app;
}

export async function createTestServer(): Promise<{
  app: NestExpressApplication;
  url: string;
}> {
  const app = await createTestApp();
  const server = await app.listen(0);
  const address = server.address() as AddressInfo;
  return { app, url: `http://127.0.0.1:${address.port}` };
}
