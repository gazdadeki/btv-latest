import { io, Socket } from 'socket.io-client';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UserRole } from '@/users/entities/user.entity';
import { createTestServer } from '../helpers/app';
import { createAgent, loginWithEmail } from '../helpers/http';
import {
  destroyDataSource,
  getDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import { createUserWithWallet } from '../helpers/seed';

const waitForConnect = (socket: Socket, timeoutMs = 3000) =>
  new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

const waitForEvent = <T>(
  socket: Socket,
  event: string,
  predicate?: (payload: T) => boolean,
  timeoutMs = 3000,
) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    const handler = (payload: T) => {
      if (predicate && !predicate(payload)) {
        return;
      }
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

describe('WebSocket auth (e2e)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    await runMigrations();
    const server = await createTestServer();
    app = server.app;
    baseUrl = server.url;
  });

  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await app.close();
    await destroyDataSource();
  });

  it('disconnects when no token is provided', async () => {
    const socket = io(baseUrl, { autoConnect: false });
    const result = await new Promise<string>((resolve) => {
      socket.on('connect_error', () => resolve('error'));
      socket.on('disconnect', () => resolve('disconnect'));
      socket.connect();
      setTimeout(() => resolve('timeout'), 2000);
    });
    socket.close();
    expect(result).not.toBe('timeout');
  });

  it('accepts valid tokens and emits activity changes to admin room', async () => {
    const dataSource = await getDataSource();
    const adminSeed = await createUserWithWallet(dataSource, {
      role: UserRole.ADMIN,
      isVerified: true,
    });
    const playerSeed = await createUserWithWallet(dataSource, {
      role: UserRole.PLAYER,
      isVerified: true,
    });

    const adminAgent = createAgent(app);
    await loginWithEmail(adminAgent, adminSeed.user.email, adminSeed.password);
    const adminTokenResponse = await adminAgent
      .get('/api/v1/auth/websocket-token')
      .expect(200);
    const adminToken = adminTokenResponse.body.token;

    const playerAgent = createAgent(app);
    await loginWithEmail(
      playerAgent,
      playerSeed.user.email,
      playerSeed.password,
    );
    const playerTokenResponse = await playerAgent
      .get('/api/v1/auth/websocket-token')
      .expect(200);
    const playerToken = playerTokenResponse.body.token;

    const adminSocket = io(baseUrl, {
      auth: { token: adminToken },
      transports: ['websocket'],
    });
    await waitForConnect(adminSocket);

    const onlineEventPromise = waitForEvent<{ userId: number; state: string }>(
      adminSocket,
      'user:activity_changed',
      (payload) =>
        payload.userId === playerSeed.user.id && payload.state === 'ONLINE',
    );

    const playerSocket = io(baseUrl, {
      auth: { token: playerToken },
      transports: ['websocket'],
    });
    await waitForConnect(playerSocket);
    await onlineEventPromise;

    const offlineEventPromise = waitForEvent<{ userId: number; state: string }>(
      adminSocket,
      'user:activity_changed',
      (payload) =>
        payload.userId === playerSeed.user.id && payload.state === 'OFFLINE',
    );

    playerSocket.disconnect();
    await offlineEventPromise;

    adminSocket.disconnect();
  });
});
