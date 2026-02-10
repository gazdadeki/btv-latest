import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

type SupertestAgent = ReturnType<typeof request.agent>;

export function createAgent(app: INestApplication): SupertestAgent {
  return request.agent(app.getHttpServer());
}

export async function loginWithEmail(
  agent: SupertestAgent,
  email: string,
  password: string,
) {
  return agent.post('/api/v1/auth/login').send({ email, password });
}
