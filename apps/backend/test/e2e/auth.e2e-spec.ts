import { NestExpressApplication } from '@nestjs/platform-express';
import { createTestApp } from '../helpers/app';
import { createAgent, loginWithEmail } from '../helpers/http';
import {
  destroyDataSource,
  getDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import { createUserWithWallet } from '../helpers/seed';

const extractCookie = (
  cookies: string | string[] | undefined,
  name: string,
) => {
  const cookieList = Array.isArray(cookies)
    ? cookies
    : cookies
      ? [cookies]
      : [];
  const cookie = cookieList.find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    return null;
  }
  return cookie.split(';')[0].slice(name.length + 1);
};

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    await runMigrations();
    app = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await app.close();
    await destroyDataSource();
  });

  it('registers a user and sets auth cookies', async () => {
    const agent = createAgent(app);
    const email = `user_${Date.now()}@test.local`;
    const username = `user_${Date.now()}`;

    const response = await agent
      .post('/api/v1/auth/register')
      .send({
        email,
        username,
        password: 'Password123!',
      })
      .expect(200);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('admin_access_token='),
        expect.stringContaining('admin_refresh_token='),
      ]),
    );
    expect(response.body.user).toMatchObject({ email, username });
    expect(response.body.accessToken).toBeUndefined();
  });

  it('logs in and returns the current user', async () => {
    const dataSource = await getDataSource();
    const { user, password } = await createUserWithWallet(dataSource, {
      isVerified: true,
    });
    const agent = createAgent(app);

    const loginResponse = await loginWithEmail(agent, user.email, password);
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('admin_access_token=')]),
    );

    const meResponse = await agent.get('/api/v1/auth/me').expect(200);
    expect(meResponse.body.id).toBe(user.id);
  });

  it('refreshes tokens via cookie and body fallback', async () => {
    const dataSource = await getDataSource();
    const { user, password } = await createUserWithWallet(dataSource, {
      isVerified: true,
    });
    const agent = createAgent(app);

    const loginResponse = await loginWithEmail(agent, user.email, password);
    expect(loginResponse.status).toBe(200);

    await agent.post('/api/v1/auth/refresh').expect(200);

    const refreshToken = extractCookie(
      loginResponse.headers['set-cookie'],
      'admin_refresh_token',
    );
    expect(refreshToken).toBeTruthy();

    await createAgent(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
  });

  it('rejects unauthenticated access and clears cookies on logout', async () => {
    const agent = createAgent(app);
    await agent.get('/api/v1/auth/me').expect(401);

    const dataSource = await getDataSource();
    const { user, password } = await createUserWithWallet(dataSource, {
      isVerified: true,
    });
    await loginWithEmail(agent, user.email, password);

    const logoutResponse = await agent.post('/api/v1/auth/logout').expect(200);
    expect(logoutResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('admin_access_token=;'),
        expect.stringContaining('admin_refresh_token=;'),
      ]),
    );
  });
});
