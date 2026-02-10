import { WebsocketService } from './websocket.service';
import { WebsocketEvents } from './events';

describe('WebsocketService', () => {
  it('broadcastEnvelope emits versioned message with correlationId', () => {
    const emit = jest.fn();
    const service = new WebsocketService({ server: { emit } } as any);

    service.broadcastEnvelope(WebsocketEvents.GameCreated, { id: 1 });

    expect(emit).toHaveBeenCalledTimes(1);
    const [event, message] = emit.mock.calls[0];
    expect(event).toBe(WebsocketEvents.GameCreated);
    expect(message.type).toBe(WebsocketEvents.GameCreated);
    expect(message.version).toBe('v1');
    expect(typeof message.correlationId).toBe('string');
    expect(message.payload).toEqual({ id: 1 });
    expect(new Date(message.timestamp).toISOString()).toBe(message.timestamp);
  });
});
