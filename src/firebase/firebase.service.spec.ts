import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  it('does not throw when Firebase is not configured', () => {
    const service = new FirebaseService({} as any, {} as any, {} as any);
    const originalPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    expect(() => service.onModuleInit()).not.toThrow();
    expect((service as any).firebaseApp).toBeUndefined();

    if (originalPath !== undefined) {
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH = originalPath;
    }
  });

  it('stringifies data for FCM payloads', () => {
    const service = new FirebaseService({} as any, {} as any, {} as any);
    const result = (service as any).stringifyData({
      count: 4,
      note: 'hello',
      empty: null,
      details: { flag: true },
    });

    expect(result).toEqual({
      count: '4',
      note: 'hello',
      empty: '',
      details: '{"flag":true}',
    });
  });
});
