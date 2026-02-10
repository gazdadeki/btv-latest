import { NestExpressApplication } from '@nestjs/platform-express';
import Stripe from 'stripe';
import { StripeService } from '@/stripe/stripe.service';
import { createTestApp } from '../helpers/app';
import {
  destroyDataSource,
  runMigrations,
  truncateAllTables,
} from '../helpers/db';
import { createAgent } from '../helpers/http';

describe('Stripe webhook (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
    }

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

  it('rejects invalid webhook signatures', async () => {
    const agent = createAgent(app);
    const payload = JSON.stringify({
      id: 'evt_invalid',
      object: 'event',
      type: 'payment_intent.succeeded',
    });

    await agent
      .post('/api/v1/stripe/webhook')
      .set('stripe-signature', 'invalid')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(payload))
      .expect(500);
  });

  it('accepts valid webhook signatures and delegates handling', async () => {
    const agent = createAgent(app);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const payload = JSON.stringify({
      id: 'evt_test',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    const stripeService = app.get(StripeService);
    const handleSpy = jest
      .spyOn(stripeService, 'handleWebhook')
      .mockResolvedValue();

    await agent
      .post('/api/v1/stripe/webhook')
      .set('stripe-signature', signature)
      .set('Content-Type', 'application/json')
      .send(Buffer.from(payload))
      .expect(201);

    expect(handleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evt_test',
        type: 'payment_intent.succeeded',
      }),
    );
  });
});
