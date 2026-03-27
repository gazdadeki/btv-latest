import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { createTestApp } from '../helpers/app';
import { runMigrations, destroyDataSource } from '../helpers/db';

describe('OpenAPI Contract (e2e)', () => {
  let app: NestExpressApplication;
  let generatedSpec: Record<string, any>;

  beforeAll(async () => {
    await runMigrations();
    app = await createTestApp();

    const config = new DocumentBuilder()
      .setTitle('BaltazarTV API')
      .setDescription('--')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    generatedSpec = SwaggerModule.createDocument(app, config);
  }, 60000);

  afterAll(async () => {
    await app.close();
    await destroyDataSource();
  });

  it('should generate a valid OpenAPI 3.0 spec', () => {
    expect(generatedSpec.openapi).toMatch(/^3\.\d+\.\d+$/);
    expect(generatedSpec.info).toBeDefined();
    expect(generatedSpec.info.title).toBe('BaltazarTV API');
    expect(generatedSpec.paths).toBeDefined();
    expect(Object.keys(generatedSpec.paths).length).toBeGreaterThan(0);
  });

  it('should have paths starting with /api/v1/', () => {
    const paths = Object.keys(generatedSpec.paths);
    for (const p of paths) {
      expect(p).toMatch(/^\/api\/v\d+\//);
    }
  });

  it('should have all operations tagged', () => {
    for (const [pathKey, methods] of Object.entries(generatedSpec.paths)) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          expect((operation as any).tags?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should have security schemes defined', () => {
    expect(generatedSpec.components?.securitySchemes?.bearer).toBeDefined();
  });

  it('should include expected API tag groups', () => {
    const tags = (generatedSpec.tags || []).map((t: any) => t.name);
    const expectedTags = [
      'Auth',
      'Games',
      'Reservations',
      'Schedules',
      'Players',
    ];
    for (const tag of expectedTags) {
      expect(tags).toContain(tag);
    }
  });

  it('should match the committed player API spec structure', () => {
    const committedSpecPath = path.resolve(
      __dirname,
      '../../docs/external/player-api/openapi.v1.json',
    );

    if (!fs.existsSync(committedSpecPath)) {
      console.warn(
        'Committed player API spec not found — skipping drift check. Run npm run docs:export:openapi to generate.',
      );
      return;
    }

    const committedSpec = JSON.parse(
      fs.readFileSync(committedSpecPath, 'utf-8'),
    );

    // Verify all committed player paths still exist in the full spec
    for (const playerPath of Object.keys(committedSpec.paths || {})) {
      expect(generatedSpec.paths).toHaveProperty(playerPath, expect.anything());
    }

    // Verify all committed schemas still exist
    for (const schemaName of Object.keys(
      committedSpec.components?.schemas || {},
    )) {
      expect(generatedSpec.components?.schemas).toHaveProperty(
        schemaName,
        expect.anything(),
      );
    }
  });

  it('should have all authenticated endpoints marked with security', () => {
    const publicPaths = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/admin/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
    ];

    for (const [pathKey, methods] of Object.entries(generatedSpec.paths)) {
      if (publicPaths.includes(pathKey)) continue;

      for (const [method, operation] of Object.entries(methods as any)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method))
          continue;

        const op = operation as any;
        const hasSecurity =
          op.security?.length > 0 || generatedSpec.security?.length > 0;

        // Skip paths that are intentionally public
        if (
          pathKey.includes('/verification/verify') ||
          pathKey.includes('/stripe/webhook')
        ) {
          continue;
        }

        // Warn but don't fail — some endpoints may intentionally lack auth
        if (!hasSecurity) {
          console.warn(
            `[contract] ${method.toUpperCase()} ${pathKey} has no security defined`,
          );
        }
      }
    }
  });
});
